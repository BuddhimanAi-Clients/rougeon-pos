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
  /** False when an administrator excluded this product from membership discounts. */
  membershipDiscountEligible?: boolean
  category: { id: string; name: string; slug: string }
  variants: CatalogVariant[]
  minPrice: string | null
  available: boolean
}

export type SaleItemInput = { variantId: string; qty: number }
export type PaymentMethod = 'cash' | 'qr' | 'split'

export type SaleItem = {
  id: string
  variantId: string
  productName: string
  variantSku: string
  variantSize: string
  variantColor: string
  qty: number
  price: string
  membershipDiscountEligible?: boolean
  discountAmount?: string
}

export type Sale = {
  id: string
  saleNumber: string
  staffId: string
  clientSaleId: string | null
  cashierName: string
  subtotal: string
  merchandiseDiscount?: string
  membershipDiscountPercent?: string
  membershipTierSnapshot?: { name?: string } | null
  membershipDiscountWaived?: boolean
  membershipDiscountWaivedPercent?: string
  membershipDiscountWaivedAmount?: string
  membershipDiscountWaivedReason?: string | null
  total: string
  paymentMethod: PaymentMethod
  /** How the total was paid; a split sale has part in each. */
  cashAmount?: string
  qrAmount?: string
  needsReview: boolean
  createdAt: string
  items: SaleItem[]
}

export type SaleListItem = Pick<Sale, 'id' | 'saleNumber' | 'subtotal' | 'total' | 'paymentMethod' | 'cashAmount' | 'qrAmount' | 'needsReview' | 'createdAt'>

export type ReceiptItem = {
  name: string
  productName?: string
  size?: string
  color?: string
  sku: string
  qty: number
  price: string
  lineTotal: string
  membershipDiscountEligible?: boolean
  discountAmount?: string
}

export type Receipt = {
  saleNumber: string
  cashierName: string
  createdAt: string
  items: ReceiptItem[]
  itemCount?: number
  subtotal: string
  discount?: { amount: string; percent: string; tierName: string | null; waived: boolean }
  total: string
  paymentMethod: PaymentMethod
  cashAmount?: string
  qrAmount?: string
  customer?: { name: string; phone: string | null } | null
  storeInfo: { name: string; address: string; phone?: string; pan?: string }
  footerNote?: string | null
}

export type PaymentQr = {
  id: string
  qrImageUrl: string
  providerName: string | null
  accountName: string | null
  accountIdentifier: string | null
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
