import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Banknote, Check, Minus, PackageSearch, Plus, QrCode, Search, ShoppingCart, Trash2, WifiOff, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError, apiRequest } from '../lib/api'
import { queueSale, readCatalog, saveCatalog } from '../lib/offline-db'
import type { CatalogProduct, CatalogVariant, PaymentMethod, QueuedSale, Sale } from '../types/pos'

type ProductResponse = { data: CatalogProduct[]; pagination: { total: number } }
type TillLine = { product: CatalogProduct; variant: CatalogVariant; qty: number }
const money = new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 })

export function NewSalePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<TillLine[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [confirming, setConfirming] = useState(false)
  const products = useQuery({
    queryKey: ['pos-products', search],
    queryFn: async () => {
      try {
        const response = await apiRequest<ProductResponse>(`/api/v1/products?limit=50${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`)
        saveCatalog(response.data)
        return response.data
      } catch (error) {
        const cached = readCatalog<CatalogProduct[]>()
        if (cached) return cached.filter((product) => !search.trim() || product.name.toLowerCase().includes(search.toLowerCase()) || product.variants.some((variant) => variant.sku.toLowerCase().includes(search.toLowerCase())))
        throw error
      }
    },
  })
  const variants = useMemo(() => products.data?.flatMap((product) => product.variants.map((variant) => ({ product, variant }))) ?? [], [products.data])
  const subtotal = lines.reduce((sum, line) => sum + Number(line.variant.price) * line.qty, 0)

  function add(product: CatalogProduct, variant: CatalogVariant) {
    const available = variant.stockQty ?? 0
    if (available <= 0) {
      toast.error(`${variant.sku} is out of stock`)
      return
    }
    setLines((current) => {
      const existing = current.find((line) => line.variant.id === variant.id)
      if (existing && existing.qty >= available) {
        toast.error(`Only ${available} units of ${variant.sku} are available`)
        return current
      }
      return existing ? current.map((line) => line.variant.id === variant.id ? { ...line, qty: line.qty + 1 } : line) : [...current, { product, variant, qty: 1 }]
    })
  }
  function changeQuantity(variantId: string, quantity: number) {
    setLines((current) => quantity <= 0 ? current.filter((line) => line.variant.id !== variantId) : current.map((line) => {
      if (line.variant.id !== variantId) return line
      const max = line.variant.stockQty ?? quantity
      if (quantity > max) { toast.error(`Only ${max} units of ${line.variant.sku} are available`); return line }
      return { ...line, qty: quantity }
    }))
  }

  async function storeOfflineSale(): Promise<QueuedSale> {
    const queued: QueuedSale = {
      clientSaleId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      paymentMethod,
      items: lines.map((line) => ({ variantId: line.variant.id, qty: line.qty })),
      previewItems: lines.map((line) => ({ variantId: line.variant.id, qty: line.qty, productName: line.product.name, sku: line.variant.sku, size: line.variant.size, color: line.variant.color, price: line.variant.price })),
      previewTotal: subtotal.toFixed(2),
    }
    await queueSale(queued)
    return queued
  }

  const complete = useMutation({
    mutationFn: async () => {
      const body = { paymentMethod, items: lines.map((line) => ({ variantId: line.variant.id, qty: line.qty })) }
      if (!navigator.onLine) return { kind: 'queued' as const, queued: await storeOfflineSale() }
      try {
        const response = await apiRequest<{ data: Sale }>('/api/v1/pos/sales', { method: 'POST', body: JSON.stringify(body) })
        return { kind: 'synced' as const, sale: response.data }
      } catch (error) {
        if (error instanceof ApiError) throw error
        return { kind: 'queued' as const, queued: await storeOfflineSale() }
      }
    },
    onSuccess: (result) => { setLines([]); navigate('/success', { state: result }) },
    onError: (error) => toast.error(error.message),
  })

  function confirmSale() { setConfirming(true) }
  return <><main className="sale-page"><section className="catalog-pane"><header className="sale-page-head"><div><p>SHIFT / NEW TRANSACTION</p><h1>NEW SALE</h1></div><div className="catalog-count">{variants.length}<span>variants loaded</span></div></header><div className="pos-search"><Search /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product name or scan SKU" /><kbd>F2</kbd></div>{products.isError ? <div className="pos-empty"><PackageSearch /><h2>CATALOGUE UNAVAILABLE</h2><p>Connect once to cache the active catalogue on this terminal.</p></div> : <div className="variant-grid">{variants.map(({ product, variant }) => <button className="variant-tile" type="button" key={variant.id} disabled={(variant.stockQty ?? 0) <= 0} onClick={() => add(product, variant)}><div className="variant-thumb">{product.images[0] ? <img src={product.images[0]} alt="" /> : <span>{product.name.slice(0,1)}</span>}<em className={(variant.stockQty ?? 0) <= 0 ? 'out' : ''}>{variant.stockQty ?? (variant.available ? '✓' : '0')}</em></div><div><p>{variant.sku}</p><h3>{product.name}</h3><span>{variant.size} / {variant.color}</span><strong>{money.format(Number(variant.price))}</strong></div></button>)}</div>}</section><aside className="till-pane"><header><div><ShoppingCart /><span>CURRENT TICKET</span></div><strong>{lines.reduce((count, line) => count + line.qty, 0).toString().padStart(2,'0')}</strong></header><div className="ticket-lines">{lines.length ? lines.map((line) => <article key={line.variant.id}><div><p>{line.variant.sku}</p><h3>{line.product.name}</h3><span>{line.variant.size} / {line.variant.color}</span></div><strong>{money.format(Number(line.variant.price) * line.qty)}</strong><div className="ticket-quantity"><button onClick={() => changeQuantity(line.variant.id, line.qty - 1)}><Minus /></button><span>{line.qty}</span><button onClick={() => changeQuantity(line.variant.id, line.qty + 1)}><Plus /></button></div><button className="ticket-remove" onClick={() => changeQuantity(line.variant.id, 0)} aria-label={`Remove ${line.product.name}`}><Trash2 /></button></article>) : <div className="empty-ticket"><ShoppingCart /><p>Add a variant to begin.</p></div>}</div><div className="till-bottom"><div className="payment-methods"><p>PAYMENT METHOD</p><button className={paymentMethod === 'cash' ? 'selected' : ''} onClick={() => setPaymentMethod('cash')}><Banknote />Cash</button><button className={paymentMethod === 'qr' ? 'selected' : ''} onClick={() => setPaymentMethod('qr')}><QrCode />QR</button></div><div className="till-total"><span>Total</span><strong>{money.format(subtotal)}</strong></div>{!navigator.onLine && <div className="offline-notice"><WifiOff /> This sale will be queued on this device.</div>}<button className="complete-sale-button" disabled={!lines.length || complete.isPending} onClick={confirmSale}>{complete.isPending ? 'Processing…' : navigator.onLine ? 'Complete sale' : 'Complete offline sale'}<span>→</span></button><small>Prices in the request are ignored. The backend uses current database prices.</small></div></aside></main>{confirming && <div className="sale-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="sale-confirm-title"><section className="sale-confirm"><button className="sale-confirm-close" aria-label="Close confirmation" onClick={() => setConfirming(false)}><X /></button><p>CONFIRM TRANSACTION</p><h2 id="sale-confirm-title">COMPLETE SALE?</h2><span>{lines.reduce((count, line) => count + line.qty, 0)} items · {paymentMethod.toUpperCase()}</span><strong>{money.format(subtotal)}</strong><div><button className="pos-secondary-button" onClick={() => setConfirming(false)}>Review ticket</button><button className="pos-primary-button" disabled={complete.isPending} onClick={() => { setConfirming(false); complete.mutate() }}><Check />Confirm sale</button></div></section></div>}</>
}
