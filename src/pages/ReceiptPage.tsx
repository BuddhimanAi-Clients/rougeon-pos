import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import type { Receipt } from '../types/pos'

type PaperWidth = '80' | '58'
const PAPER_KEY = 'rogueon-pos-receipt-paper'

// Receipt printers have no thousands-grouping quirks to worry about, but they do
// need short lines: amounts are printed without the currency on each row.
const amount = (value: string | number) => Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function readPaperWidth(): PaperWidth {
  try { return localStorage.getItem(PAPER_KEY) === '58' ? '58' : '80' } catch { return '80' }
}

export function ReceiptPage() {
  const { saleId = '' } = useParams()
  const [params] = useSearchParams()
  const [paper, setPaper] = useState<PaperWidth>(readPaperWidth)
  const autoPrinted = useRef(false)
  const paperRef = useRef<HTMLElement>(null)
  const pageStyleRef = useRef<HTMLStyleElement>(null)
  const receipt = useQuery({ queryKey: ['receipt', saleId], queryFn: async () => (await apiRequest<{ data: Receipt }>(`/api/v1/pos/receipts/${saleId}`)).data })

  // Receipt printers use a continuous roll, but browsers need a fixed page
  // size. Match the page to the roll width and to this receipt's own length so
  // nothing is scaled, split across pages or followed by blank paper.
  useEffect(() => {
    function syncPageSize() {
      const element = paperRef.current
      const style = pageStyleRef.current
      if (!element || !style) return
      const heightMm = Math.ceil(element.getBoundingClientRect().height * 25.4 / 96) + 4
      style.textContent = `@media print { @page { size: ${paper}mm ${heightMm}mm; margin: 0 } }`
    }
    syncPageSize()
    window.addEventListener('beforeprint', syncPageSize)
    return () => window.removeEventListener('beforeprint', syncPageSize)
  }, [receipt.data, paper])

  // Opened from "Print receipt" after a sale: print as soon as the bill is ready.
  useEffect(() => {
    if (!receipt.data || autoPrinted.current || params.get('print') !== '1') return
    autoPrinted.current = true
    const timer = window.setTimeout(() => window.print(), 300)
    return () => window.clearTimeout(timer)
  }, [receipt.data, params])

  function choosePaper(next: PaperWidth) {
    setPaper(next)
    try { localStorage.setItem(PAPER_KEY, next) } catch { /* preference only */ }
  }

  if (receipt.isPending) return <div className="pos-loading">Generating receipt…</div>
  if (receipt.isError || !receipt.data) return <div className="pos-empty full"><h2>RECEIPT NOT FOUND</h2><Link to="/history">Return to history</Link></div>

  const data = receipt.data
  const discount = Number(data.discount?.amount ?? 0)
  const itemCount = data.itemCount ?? data.items.reduce((count, item) => count + item.qty, 0)
  const date = new Date(data.createdAt)

  return (
    <main className="receipt-page">
      <style ref={pageStyleRef} />
      <div className="receipt-toolbar">
        <Link to="/history"><ArrowLeft /> History</Link>
        <div className="receipt-paper-choice" role="group" aria-label="Receipt paper width">
          <span>Paper</span>
          <button type="button" className={paper === '80' ? 'selected' : ''} onClick={() => choosePaper('80')}>80 mm</button>
          <button type="button" className={paper === '58' ? 'selected' : ''} onClick={() => choosePaper('58')}>58 mm</button>
        </div>
        <button type="button" className="receipt-print" onClick={() => window.print()}><Printer /> Print receipt</button>
      </div>

      <article ref={paperRef} className={`thermal-receipt paper-${paper}`}>
        <header>
          <img className="receipt-logo" src="/brand/star.png" alt="" />
          <h1>{data.storeInfo.name}</h1>
          <p>{data.storeInfo.address}</p>
          {data.storeInfo.phone && <p>Tel: {data.storeInfo.phone}</p>}
          {data.storeInfo.pan && <p>PAN: {data.storeInfo.pan}</p>}
          <strong>SALES RECEIPT</strong>
        </header>

        <dl className="thermal-meta">
          <div><dt>Receipt</dt><dd>{data.saleNumber}</dd></div>
          <div><dt>Date</dt><dd>{date.toLocaleDateString('en-GB')} {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</dd></div>
          <div><dt>Cashier</dt><dd>{data.cashierName}</dd></div>
          {data.customer && <div><dt>Customer</dt><dd>{data.customer.name}{data.customer.phone ? ` (${data.customer.phone})` : ''}</dd></div>}
        </dl>

        <table className="thermal-items">
          <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={`${item.sku}-${index}`}>
                <td>
                  <strong>{item.productName ?? item.name}</strong>
                  <span>{item.size && item.color ? `${item.size} / ${item.color}` : item.sku} @ {amount(item.price)}</span>
                  {item.membershipDiscountEligible === false && discount > 0 && <span>* no member discount</span>}
                </td>
                <td>{item.qty}</td>
                <td>{amount(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="thermal-totals">
          <div><dt>Subtotal</dt><dd>{amount(data.subtotal)}</dd></div>
          {discount > 0 && <div><dt>Member discount{data.discount?.tierName ? ` (${data.discount.tierName} ${Number(data.discount.percent)}%)` : ''}</dt><dd>-{amount(discount)}</dd></div>}
          <div className="thermal-grand"><dt>TOTAL NPR</dt><dd>{amount(data.total)}</dd></div>
          {data.paymentMethod === 'split'
            ? <><div><dt>Paid by QR</dt><dd>{amount(data.qrAmount ?? 0)}</dd></div><div><dt>Paid by cash</dt><dd>{amount(data.cashAmount ?? 0)}</dd></div></>
            : <div><dt>Paid by</dt><dd>{data.paymentMethod === 'qr' ? 'QR' : 'CASH'}</dd></div>}
          <div><dt>Items</dt><dd>{itemCount}</dd></div>
        </dl>

        <footer>
          <p>THANK YOU FOR SHOPPING AT ROGUEON</p>
          {data.footerNote && <p>{data.footerNote}</p>}
          <span>{data.saleNumber}</span>
        </footer>
      </article>
    </main>
  )
}
