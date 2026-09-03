import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiRequest } from '../lib/api'
import { deleteQueuedSale, listQueuedSales, updateQueuedSale } from '../lib/offline-db'
import type { QueuedSale, SyncResult } from '../types/pos'

const money = new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 })
export function SyncPage() {
  const [queue, setQueue] = useState<QueuedSale[]>([])
  const [loading, setLoading] = useState(true)
  async function refresh() { setLoading(true); setQueue(await listQueuedSales()); setLoading(false) }
  useEffect(() => {
    let active = true
    void listQueuedSales().then((sales) => {
      if (active) {
        setQueue(sales)
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [])
  const sync = useMutation({
    mutationFn: async () => {
      const batch = queue.slice(0, 100)
      const response = await apiRequest<{ data: { results: SyncResult[] } }>('/api/v1/pos/sync', { method: 'POST', body: JSON.stringify({ sales: batch.map(({ clientSaleId, occurredAt, items, paymentMethod }) => ({ clientSaleId, occurredAt, items, paymentMethod })) }) })
      for (const result of response.data.results) {
        const queued = batch[result.index]
        if (!queued) continue
        if (result.status === 'synced') await deleteQueuedSale(queued.clientSaleId)
        else await updateQueuedSale({ ...queued, lastError: result.error })
      }
      return response.data.results
    },
    onSuccess: async (results) => { const synced = results.filter((result) => result.status === 'synced').length; toast.success(`${synced} queued sale${synced === 1 ? '' : 's'} synchronized`); await refresh() },
    onError: (error) => toast.error(error.message),
  })
  return <main className="pos-content-page sync-page"><header className="pos-page-head"><div><p>DEVICE / OFFLINE QUEUE</p><h1>SYNC STATUS</h1></div><div className={navigator.onLine ? 'sync-online' : 'sync-offline'}>{navigator.onLine ? <CheckCircle2 /> : <CloudOff />}{navigator.onLine ? 'Connected' : 'Offline'}</div></header><section className="sync-summary"><div><span>Queued transactions</span><strong>{queue.length}</strong></div><p>Sales are stored only on this browser until synchronization succeeds. Stable client IDs make retries safe.</p><button className="pos-primary-button" disabled={!navigator.onLine || !queue.length || sync.isPending} onClick={() => sync.mutate()}><RefreshCw /> {sync.isPending ? 'Syncing…' : `Sync up to ${Math.min(100, queue.length)} sales`}</button></section>{loading ? <div className="pos-loading">Reading device queue…</div> : queue.length ? <div className="queue-list">{queue.map((sale) => <article key={sale.clientSaleId}><div className="queue-state">{sale.lastError ? <AlertTriangle /> : <CloudOff />}</div><div><p>{sale.clientSaleId}</p><h2>{new Date(sale.occurredAt).toLocaleString()}</h2><span>{sale.items.reduce((total, item) => total + item.qty, 0)} units / {sale.paymentMethod.toUpperCase()}</span>{sale.lastError && <em>{sale.lastError.code}: {sale.lastError.message}</em>}</div><strong>{money.format(Number(sale.previewTotal))}</strong><button aria-label="Remove queued sale" onClick={async () => { if (confirm('Remove this queued sale from this device? This cannot be undone.')) { await deleteQueuedSale(sale.clientSaleId); await refresh() } }}><Trash2 /></button></article>)}</div> : <div className="pos-empty"><CheckCircle2 /><h2>QUEUE IS CLEAR</h2><p>There are no offline transactions waiting on this device.</p></div>}</main>
}
