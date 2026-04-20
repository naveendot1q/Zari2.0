export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  instagram_handle: string | null
  date_of_birth: string | null
  gender: 'female' | 'male' | 'other' | null
  role: 'customer' | 'admin'
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  parent_id: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  short_description: string | null
  category_id: string
  category?: Category
  images: string[]
  price: number
  compare_price: number | null
  cost_price: number | null
  sku: string
  tags: string[]
  material: string | null
  care_instructions: string | null
  origin: string | null
  is_active: boolean
  is_featured: boolean
  weight_grams: number | null
  instagram_post_ids: string[]
  ai_description: string | null
  vector_id: string | null
  total_stock: number
  rating_avg: number
  rating_count: number
  created_at: string
  updated_at: string
  variants?: ProductVariant[]
}

export interface ProductVariant {
  id: string
  product_id: string
  size: string
  color: string
  color_hex: string | null
  stock: number
  sku: string
  price_modifier: number
  images: string[]
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  profile?: Profile
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: 'stripe' | 'cod'
  stripe_payment_intent_id: string | null
  stripe_payment_link: string | null
  subtotal: number
  discount: number
  shipping_charge: number
  tax: number
  total: number
  coupon_code: string | null
  shipping_address: AddressSnapshot
  billing_address: AddressSnapshot
  shiprocket_order_id: string | null
  shiprocket_shipment_id: string | null
  awb_code: string | null
  courier_name: string | null
  tracking_url: string | null
  notes: string | null
  instagram_source: string | null
  items?: OrderItem[]
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product?: Product
  variant_id: string | null
  variant?: ProductVariant
  product_name: string
  variant_label: string | null
  image_url: string
  quantity: number
  price: number
  total: number
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  product?: Product
  variant_id: string | null
  variant?: ProductVariant
  quantity: number
  created_at: string
}

export interface WishlistItem {
  id: string
  user_id: string
  product_id: string
  product?: Product
  created_at: string
}

export interface Review {
  id: string
  product_id: string
  user_id: string
  profile?: Profile
  order_id: string | null
  rating: number
  title: string | null
  body: string | null
  images: string[]
  is_verified_purchase: boolean
  is_approved: boolean
  created_at: string
}

export interface Address {
  id: string
  user_id: string
  label: 'home' | 'work' | 'other'
  full_name: string
  phone: string
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
  is_default: boolean
  created_at: string
}

export interface AddressSnapshot {
  full_name: string
  phone: string
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
}

export interface Coupon {
  id: string
  code: string
  type: 'percentage' | 'flat'
  value: number
  min_order_value: number | null
  max_discount: number | null
  usage_limit: number | null
  used_count: number
  valid_from: string
  valid_until: string
  is_active: boolean
  created_at: string
}

export type OrderStatus =
  | 'pending' | 'confirmed' | 'processing' | 'shipped'
  | 'out_for_delivery' | 'delivered' | 'cancelled'
  | 'return_requested' | 'returned'

export type PaymentStatus =
  | 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface SearchFilters {
  category?: string
  min_price?: number
  max_price?: number
  sizes?: string[]
  colors?: string[]
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating'
}

export interface CartSummary {
  items: CartItem[]
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
  coupon: Coupon | null
}

export interface CheckoutPayload {
  address_id: string
  payment_method: 'stripe' | 'cod'
  coupon_code?: string
  notes?: string
}

export interface AIStylingMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ShiprocketOrderPayload {
  order_id: string
  order_date: string
  pickup_location: string
  channel_id: number
  billing_customer_name: string
  billing_address: string
  billing_city: string
  billing_state: string
  billing_country: string
  billing_pincode: string
  billing_phone: string
  shipping_is_billing: boolean
  order_items: { name: string; sku: string; units: number; selling_price: number; category: string }[]
  payment_method: 'Prepaid' | 'COD'
  sub_total: number
  length: number
  breadth: number
  height: number
  weight: number
}
