export type UserRole = 'customer' | 'cashier' | 'admin'

export type CatalogVariant = {
  id: string
  sku: string
  size: string
  color: string
  price: string
  available: boolean
  stockQty?: number
}

export type CatalogProduct = {
  id: string
  name: string
  slug: string
  description: string
  images: string[]
  category: { id: string; name: string; slug: string }
  variants: CatalogVariant[]
  minPrice: string | null
  available: boolean
}

export type SaleItemInput = { variantId: string; qty: number }
export type PaymentMethod = 'cash' | 'qr'

export type SaleItem = {
  id: string
  variantId: string
  productName: string
  variantSku: string
  variantSize: string
  variantColor: string
  qty: number
  price: string
}

export type Sale = {
  id: string
  saleNumber: string
  staffId: string
  clientSaleId: string | null
  cashierName: string
  subtotal: string
  total: string
  paymentMethod: PaymentMethod
  needsReview: boolean
  createdAt: string
  items: SaleItem[]
}

export type SaleListItem = Pick<Sale, 'id' | 'saleNumber' | 'subtotal' | 'total' | 'paymentMethod' | 'needsReview' | 'createdAt'>

export type Receipt = {
  saleNumber: string
  cashierName: string
  createdAt: string
  items: { name: string; sku: string; qty: number; price: string; lineTotal: string }[]
  subtotal: string
  total: string
  paymentMethod: PaymentMethod
  storeInfo: { name: string; address: string }
}

export type QueuePreviewItem = SaleItemInput & {
  productName: string
  sku: string
  size: string
  color: string
  price: string
}

export type QueuedSale = {
  clientSaleId: string
  occurredAt: string
  items: SaleItemInput[]
  paymentMethod: PaymentMethod
  previewItems: QueuePreviewItem[]
  previewTotal: string
  lastError?: { code: string; message: string }
}

export type SyncResult =
  | { index: number; status: 'synced'; needsReview: boolean; replayed: boolean; sale: Sale }
  | { index: number; status: 'failed'; error: { code: string; message: string } }
