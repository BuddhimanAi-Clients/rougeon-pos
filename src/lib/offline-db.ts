import type { QueuedSale } from '../types/pos'

const DATABASE_NAME = 'rogueon-pos'
const STORE_NAME = 'queued-sales'

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'clientSaleId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function complete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export async function queueSale(sale: QueuedSale) {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  transaction.objectStore(STORE_NAME).put(sale)
  await complete(transaction)
  database.close()
}

export async function listQueuedSales(): Promise<QueuedSale[]> {
  const database = await openDatabase()
  const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()
  const sales = await new Promise<QueuedSale[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as QueuedSale[])
    request.onerror = () => reject(request.error)
  })
  database.close()
  return sales.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
}

export async function deleteQueuedSale(clientSaleId: string) {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  transaction.objectStore(STORE_NAME).delete(clientSaleId)
  await complete(transaction)
  database.close()
}

export async function updateQueuedSale(sale: QueuedSale) {
  return queueSale(sale)
}

export function saveCatalog(products: unknown) {
  localStorage.setItem('rogueon-pos-catalog', JSON.stringify(products))
}

export function readCatalog<T>(): T | undefined {
  try {
    const value = localStorage.getItem('rogueon-pos-catalog')
    return value ? JSON.parse(value) as T : undefined
  } catch {
    return undefined
  }
}
