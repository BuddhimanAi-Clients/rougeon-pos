import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import type { Receipt } from '../types/pos'

const money = new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 })
export function ReceiptPage() {
  const { saleId = '' } = useParams()
  const receipt = useQuery({ queryKey: ['receipt', saleId], queryFn: async () => (await apiRequest<{ data: Receipt }>(`/api/v1/pos/receipts/${saleId}`)).data })
  if (receipt.isPending) return <div className="pos-loading">Generating receipt…</div>
  if (receipt.isError || !receipt.data) return <div className="pos-empty full"><h2>RECEIPT NOT FOUND</h2><Link to="/history">Return to history</Link></div>
  return <main className="receipt-page"><div className="receipt-toolbar"><Link to="/history"><ArrowLeft /> History</Link><button onClick={() => window.print()}><Printer /> Print receipt</button></div><article className="receipt-paper"><header><h1>{receipt.data.storeInfo.name}</h1><p>{receipt.data.storeInfo.address}</p><span>OFFICIAL SALES RECEIPT</span></header><section className="receipt-meta"><div><span>Sale</span><strong>{receipt.data.saleNumber}</strong></div><div><span>Cashier</span><strong>{receipt.data.cashierName}</strong></div><div><span>Date</span><strong>{new Date(receipt.data.createdAt).toLocaleString()}</strong></div><div><span>Payment</span><strong>{receipt.data.paymentMethod.toUpperCase()}</strong></div></section><section className="receipt-items"><div><span>Item</span><span>Qty</span><span>Total</span></div>{receipt.data.items.map((item, index) => <article key={`${item.sku}-${index}`}><span><strong>{item.name}</strong><small>{item.sku} / {money.format(Number(item.price))} each</small></span><b>{item.qty}</b><strong>{money.format(Number(item.lineTotal))}</strong></article>)}</section><section className="receipt-total"><span>TOTAL</span><strong>{money.format(Number(receipt.data.total))}</strong></section><footer><p>THANK YOU FOR SHOPPING ROGUEON.</p><span>Immutable transaction record / {receipt.data.saleNumber}</span></footer></article></main>
}
