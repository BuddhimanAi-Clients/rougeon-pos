import { Check, CloudOff, Printer, ReceiptText, RotateCcw } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import type { QueuedSale, Sale } from '../types/pos'

type SuccessState = { kind: 'synced'; sale: Sale } | { kind: 'queued'; queued: QueuedSale }
const money = new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 })

export function SaleSuccessPage() {
  const state = useLocation().state as SuccessState | null
  if (!state) return <Navigate to="/sale" replace />
  const synced = state.kind === 'synced'
  const reference = synced ? state.sale.saleNumber : state.queued.clientSaleId
  const total = synced ? state.sale.total : state.queued.previewTotal
  return <main className="sale-success"><section className={`success-icon ${synced ? '' : 'queued'}`}>{synced ? <Check /> : <CloudOff />}</section><p>{synced ? 'TRANSACTION COMPLETE' : 'OFFLINE TRANSACTION STORED'}</p><h1>{synced ? 'SALE\nCOMPLETE.' : 'QUEUED\nSAFELY.'}</h1><div className="success-reference"><span>{synced ? 'Sale number' : 'Client sale ID'}</span><strong>{reference}</strong></div><div className="success-total"><span>Total charged</span><strong>{money.format(Number(total))}</strong></div><div className="success-actions"><Link className="pos-primary-button" to="/sale"><RotateCcw /> New sale</Link>{synced ? <Link className="pos-secondary-button" to={`/receipt/${state.sale.id}`}><ReceiptText /> View receipt</Link> : <Link className="pos-secondary-button" to="/sync"><CloudOff /> View sync queue</Link>}{synced && <Link className="pos-secondary-button" to={`/receipt/${state.sale.id}?print=1`}><Printer /> Print receipt</Link>}</div>{!synced && <small>The customer-facing total uses the cached catalogue price. On sync, the backend applies its current database price as approved.</small>}</main>
}
