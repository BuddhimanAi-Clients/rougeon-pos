import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Banknote, Check, Minus, PackageSearch, Plus, QrCode, Search, ShoppingCart, Trash2, WifiOff, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '../lib/api'
import { readCatalog, saveCatalog } from '../lib/offline-db'
import type { CatalogProduct, CatalogVariant, PaymentMethod, Sale } from '../types/pos'

type ProductResponse = { data: CatalogProduct[]; pagination: { total: number } }
type Line = { product: CatalogProduct; variant: CatalogVariant; qty: number }
type Customer = {
  id: string
  fullName: string
  normalizedPhone: string
  normalizedEmail: string
  eligibleNetSpend?: string
  tierName?: string | null
  discountPercent?: string
  activatedAt?: string | null
}

const money = new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 })

export function NewSalePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [confirming, setConfirming] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [newCustomer, setNewCustomer] = useState(false)

  const customers = useQuery({
    queryKey: ['pos-customers', customerSearch],
    enabled: customerSearch.trim().length >= 3,
    queryFn: async () => (await apiRequest<{ data: Customer[] }>(`/api/v1/pos/customers?sort=name_asc&search=${encodeURIComponent(customerSearch)}`)).data,
  })
  const products = useQuery({
    queryKey: ['pos-products', search],
    queryFn: async () => {
      try {
        const response = await apiRequest<ProductResponse>(`/api/v1/products?limit=50${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`)
        saveCatalog(response.data)
        return response.data
      } catch {
        const cached = readCatalog<CatalogProduct[]>()
        if (cached) return cached.filter(p => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.variants.some(v => v.sku.toLowerCase().includes(search.toLowerCase())))
        throw new Error('Catalog unavailable')
      }
    },
  })
  const variants = useMemo(() => products.data?.flatMap(product => product.variants.map(variant => ({ product, variant }))) ?? [], [products.data])
  const subtotal = lines.reduce((sum, line) => sum + Number(line.variant.price) * line.qty, 0)
  const discountPercent = customer ? Number(customer.discountPercent ?? 0) : 0
  const discountAmount = subtotal * discountPercent / 100
  const estimatedTotal = subtotal - discountAmount

  function add(product: CatalogProduct, variant: CatalogVariant) {
    const available = variant.stockQty ?? 0
    if (available <= 0) return toast.error(`${variant.sku} is out of stock`)
    setLines(current => {
      const item = current.find(line => line.variant.id === variant.id)
      if (item && item.qty >= available) {
        toast.error(`Only ${available} units available`)
        return current
      }
      return item
        ? current.map(line => line.variant.id === variant.id ? { ...line, qty: line.qty + 1 } : line)
        : [...current, { product, variant, qty: 1 }]
    })
  }
  function quantity(id: string, qty: number) {
    setLines(current => qty <= 0
      ? current.filter(line => line.variant.id !== id)
      : current.map(line => line.variant.id === id ? { ...line, qty: Math.min(qty, line.variant.stockQty ?? qty) } : line))
  }
  const complete = useMutation({
    mutationFn: async () => {
      if (!navigator.onLine) throw new Error('Reconnect before completing this sale.')
      if (!customer) throw new Error('Select a customer before completing this sale.')
      return (await apiRequest<{ data: Sale }>('/api/v1/pos/sales', {
        method: 'POST',
        body: JSON.stringify({ customerProfileId: customer.id, paymentMethod, items: lines.map(line => ({ variantId: line.variant.id, qty: line.qty })) }),
      })).data
    },
    onSuccess: sale => { setLines([]); navigate('/success', { state: { kind: 'synced', sale } }) },
    onError: (error: Error) => toast.error(error.message),
  })
  const create = useMutation({
    mutationFn: (body: unknown) => apiRequest<{ data: Customer }>('/api/v1/pos/customers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: ({ data }) => { setCustomer(data); setNewCustomer(false); toast.success('Customer created and selected') },
    onError: (error: Error) => toast.error(error.message),
  })

  return <>
    {newCustomer && <div className="sale-confirm-backdrop" role="dialog" aria-modal="true"><section className="sale-confirm customer-create">
      <button className="sale-confirm-close" onClick={() => setNewCustomer(false)}><X /></button>
      <p>CREATE CUSTOMER</p><h2>NEW PROFILE</h2>
      <form onSubmit={event => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const date = String(form.get('dob')).split('-').map(Number)
        create.mutate({ fullName: form.get('fullName'), phone: form.get('phone'), email: form.get('email'), dobCalendar: form.get('calendar'), dob: { year: date[0], month: date[1], day: date[2] } })
      }}>
        <label>Full name<input name="fullName" required /></label>
        <label>Phone<input name="phone" required /></label>
        <label>Email<input name="email" type="email" required /></label>
        <label>Calendar<select name="calendar"><option>AD</option><option>BS</option></select></label>
        <label>Date of birth (YYYY-MM-DD)<input name="dob" placeholder="2000-01-31" required /></label>
        <button className="pos-primary-button" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Create & select'}</button>
      </form>
    </section></div>}
    <main className="sale-page"><section className="catalog-pane">
      <header className="sale-page-head"><div><p>SHIFT / NEW TRANSACTION</p><h1>NEW SALE</h1></div><div className="catalog-count">{variants.length}<span>variants loaded</span></div></header>
      <div className="pos-search"><Search /><input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Search product name or scan SKU" /><kbd>F2</kbd></div>
      {products.isError ? <div className="pos-empty"><PackageSearch /><h2>CATALOGUE UNAVAILABLE</h2><p>Connect before completing a customer sale.</p></div> : <div className="variant-grid">{variants.map(({ product, variant }) =>
        <button className="variant-tile" type="button" key={variant.id} disabled={(variant.stockQty ?? 0) <= 0} onClick={() => add(product, variant)}>
          <div className="variant-thumb">{product.images[0] ? <img src={product.images[0]} alt="" /> : <span>{product.name.slice(0, 1)}</span>}<em className={(variant.stockQty ?? 0) <= 0 ? 'out' : ''}>{variant.stockQty ?? 0}</em></div>
          <div><p>{variant.sku}</p><h3>{product.name}</h3><span>{variant.size} / {variant.color}</span><strong>{money.format(Number(variant.price))}</strong></div>
        </button>)}</div>}
    </section><aside className="till-pane">
      <header><div><ShoppingCart /><span>CURRENT TICKET</span></div><strong>{String(lines.reduce((count, line) => count + line.qty, 0)).padStart(2, '0')}</strong></header>
      <div className="payment-methods customer-picker">
        <p>CUSTOMER / MEMBERSHIP <button type="button" onClick={() => setNewCustomer(true)}><Plus /> New</button></p>
        {customer ? <><p><strong>{customer.fullName}</strong> · {customer.normalizedPhone}<button onClick={() => setCustomer(null)}>Change</button></p>
          <div className="membership-ticket-summary"><span>{customer.tierName ?? 'No active tier'}</span><strong>{discountPercent > 0 ? `${discountPercent}% member price` : 'Standard price'}</strong>{customer.eligibleNetSpend !== undefined && <small>Eligible spend: {money.format(Number(customer.eligibleNetSpend))}</small>}</div>
        </> : <><input value={customerSearch} onChange={event => setCustomerSearch(event.target.value)} placeholder="Search phone, email, or name" />{customers.data?.map(result => <button key={result.id} onClick={() => { setCustomer(result); setCustomerSearch('') }}>{result.fullName} · {result.normalizedPhone}</button>)}</>}
      </div>
      <div className="ticket-lines">{lines.length ? lines.map(line => <article key={line.variant.id}>
        <div><p>{line.variant.sku}</p><h3>{line.product.name}</h3><span>{line.variant.size} / {line.variant.color}</span></div>
        <strong>{money.format(Number(line.variant.price) * line.qty)}</strong>
        <div className="ticket-quantity"><button onClick={() => quantity(line.variant.id, line.qty - 1)}><Minus /></button><span>{line.qty}</span><button onClick={() => quantity(line.variant.id, line.qty + 1)}><Plus /></button></div>
        <button className="ticket-remove" onClick={() => quantity(line.variant.id, 0)}><Trash2 /></button>
      </article>) : <div className="empty-ticket"><ShoppingCart /><p>Add a variant to begin.</p></div>}</div>
      <div className="till-bottom">
        <div className="payment-methods"><p>PAYMENT METHOD</p><button className={paymentMethod === 'cash' ? 'selected' : ''} onClick={() => setPaymentMethod('cash')}><Banknote />Cash</button><button className={paymentMethod === 'qr' ? 'selected' : ''} onClick={() => setPaymentMethod('qr')}><QrCode />QR</button></div>
        <div className="till-total"><span>Merchandise subtotal</span><strong>{money.format(subtotal)}</strong>{discountPercent > 0 && <><span>Member discount · {discountPercent}%</span><strong>−{money.format(discountAmount)}</strong></>}<span>Estimated total</span><strong>{money.format(estimatedTotal)}</strong></div>
        {!navigator.onLine && <div className="offline-notice"><WifiOff /> Reconnect to complete this membership sale.</div>}
        <button className="complete-sale-button" disabled={!lines.length || !customer || complete.isPending || !navigator.onLine} onClick={() => { if (!customer) toast.error('Select a customer first'); else setConfirming(true) }}>{complete.isPending ? 'Processing…' : 'Complete sale'}<span>→</span></button>
        <small>Membership totals are estimated here and rechecked by the server at payment.</small>
      </div>
    </aside></main>
    {confirming && <div className="sale-confirm-backdrop" role="dialog" aria-modal="true"><section className="sale-confirm"><button className="sale-confirm-close" onClick={() => setConfirming(false)}><X /></button><p>CONFIRM TRANSACTION</p><h2>COMPLETE SALE?</h2><span>{lines.reduce((count, line) => count + line.qty, 0)} items · {paymentMethod.toUpperCase()}</span><strong>{money.format(estimatedTotal)}</strong><div><button className="pos-secondary-button" onClick={() => setConfirming(false)}>Review ticket</button><button className="pos-primary-button" onClick={() => { setConfirming(false); complete.mutate() }}><Check />Confirm sale</button></div></section></div>}
  </>
}
