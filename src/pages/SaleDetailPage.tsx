import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ReceiptText } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import type { Sale } from '../types/pos'

const money = new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 })
export function SaleDetailPage() {
  const { saleId = '' } = useParams()
  const sale = useQuery({ queryKey: ['pos-sale', saleId], queryFn: async () => (await apiRequest<{ data: Sale }>(`/api/v1/pos/sales/${saleId}`)).data })
  if (sale.isPending) return <div className="pos-loading">Loading sale…</div>
  if (sale.isError || !sale.data) return <div className="pos-empty full"><h2>SALE NOT FOUND</h2><Link to="/history">Return to history</Link></div>
  return <main className="pos-content-page sale-detail"><Link className="pos-back" to="/history"><ArrowLeft /> History</Link><header><p>TRANSACTION DETAIL</p><h1>{sale.data.saleNumber}</h1><span>{new Date(sale.data.createdAt).toLocaleString()} / {sale.data.cashierName}</span></header><div className="sale-detail-grid"><section><div className="detail-table-head"><span>Item</span><span>Qty</span><span>Unit</span><span>Total</span></div>{sale.data.items.map((item) => <article key={item.id}><div><p>{item.variantSku}</p><strong>{item.productName}</strong><span>{item.variantSize} / {item.variantColor}</span></div><b>{item.qty}</b><span>{money.format(Number(item.price))}</span><strong>{money.format(Number(item.price) * item.qty)}</strong></article>)}</section><aside><dl><div><dt>Payment</dt><dd>{sale.data.paymentMethod}</dd></div><div><dt>Offline key</dt><dd>{sale.data.clientSaleId ?? 'Live sale'}</dd></div><div><dt>Review</dt><dd>{sale.data.needsReview ? 'Required' : 'Clear'}</dd></div></dl><div><span>Total</span><strong>{money.format(Number(sale.data.total))}</strong></div><Link className="pos-primary-button" to={`/receipt/${sale.data.id}`}><ReceiptText /> Open receipt</Link></aside></div></main>
}
