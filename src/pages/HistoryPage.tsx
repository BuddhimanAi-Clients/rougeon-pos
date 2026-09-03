import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Banknote, History, QrCode } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import type { SaleListItem } from '../types/pos'

type SalesResponse = { data: SaleListItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
const money = new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 })

export function HistoryPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)
  const sales = useQuery({ queryKey: ['pos-sales', page], queryFn: () => apiRequest<SalesResponse>(`/api/v1/pos/sales?page=${page}&limit=20`) })
  return <main className="pos-content-page"><header className="pos-page-head"><div><p>SHIFT / TRANSACTION LOG</p><h1>SALES HISTORY</h1></div><History /></header>{sales.isPending ? <div className="pos-loading">Loading transactions…</div> : sales.data?.data.length ? <><div className="sales-table"><div className="sales-table-head"><span>Reference</span><span>Time</span><span>Method</span><span>Review</span><span>Total</span><span /></div>{sales.data.data.map((sale) => <Link to={`/history/${sale.id}`} key={sale.id}><strong>{sale.saleNumber}</strong><span>{new Date(sale.createdAt).toLocaleString()}</span><span className="method-cell">{sale.paymentMethod === 'cash' ? <Banknote /> : <QrCode />}{sale.paymentMethod}</span><span>{sale.needsReview ? <em className="review-flag">Review</em> : '—'}</span><strong>{money.format(Number(sale.total))}</strong><ArrowRight /></Link>)}</div><nav className="pos-pagination"><button disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>Previous</button><span>{page} / {sales.data.pagination.totalPages}</span><button disabled={page >= sales.data.pagination.totalPages} onClick={() => setParams({ page: String(page + 1) })}>Next</button></nav></> : <div className="pos-empty"><History /><h2>NO SALES YET</h2><p>Completed transactions from this cashier will appear here.</p><Link to="/sale">Start a sale</Link></div>}</main>
}
