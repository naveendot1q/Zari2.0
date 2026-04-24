import type { Order, ShiprocketOrderPayload } from '@/types'

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external'
let cachedToken: string | null = null
let tokenExpiry = 0

async function getToken(): Promise<string | null> {
  if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) return null
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
  })
  const data = await res.json() as { token: string }
  cachedToken = data.token
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000
  return cachedToken
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export async function createShiprocketOrder(order: Order): Promise<{ shiprocket_order_id: string; shipment_id: string }> {
  const token = await getToken()
  if (!token) throw new Error('Shiprocket not configured')

  const addr = order.shipping_address
  const payload: ShiprocketOrderPayload = {
    order_id: order.order_number,
    order_date: new Date(order.created_at).toISOString().replace('T', ' ').slice(0, 19),
    pickup_location: 'Primary',
    channel_id: Number(process.env.SHIPROCKET_CHANNEL_ID),
    billing_customer_name: addr.full_name,
    billing_address: addr.line1 + (addr.line2 ? ', ' + addr.line2 : ''),
    billing_city: addr.city,
    billing_state: addr.state,
    billing_country: 'India',
    billing_pincode: addr.pincode,
    billing_phone: addr.phone,
    shipping_is_billing: true,
    order_items: (order.items ?? []).map(item => ({
      name: item.product_name + (item.variant_label ? ` (${item.variant_label})` : ''),
      sku: item.variant_id ?? item.product_id,
      units: item.quantity,
      selling_price: item.price / 100,
      category: 'Women Clothing',
    })),
    payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
    sub_total: order.total / 100,
    length: 30, breadth: 25, height: 5, weight: 0.5,
  }

  const res = await fetch(`${BASE_URL}/orders/create/adhoc`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  const data = await res.json() as { order_id: string; shipment_id: string }
  return { shiprocket_order_id: String(data.order_id), shipment_id: String(data.shipment_id) }
}

export async function generateAWB(shipmentId: string): Promise<string> {
  const token = await getToken()
  if (!token) return ''
  const res = await fetch(`${BASE_URL}/courier/assign/awb`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ shipment_id: shipmentId }),
  })
  const data = await res.json() as { response?: { data?: { awb_code?: string } } }
  return data.response?.data?.awb_code ?? ''
}

export async function requestPickup(shipmentId: string): Promise<void> {
  const token = await getToken()
  if (!token) return
  await fetch(`${BASE_URL}/courier/generate/pickup`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  })
}

export async function trackShipment(awbCode: string) {
  const token = await getToken()
  if (!token) return null
  const res = await fetch(`${BASE_URL}/courier/track/awb/${awbCode}`, { headers: authHeaders(token) })
  const data = await res.json() as { tracking_data: unknown }
  return data.tracking_data
}

export async function cancelShiprocketOrder(orderId: string): Promise<void> {
  const token = await getToken()
  if (!token) return
  await fetch(`${BASE_URL}/orders/cancel`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ ids: [orderId] }),
  })
}

export function mapShiprocketStatus(srStatus: string): string {
  const map: Record<string, string> = {
    'NEW': 'confirmed', 'READY TO SHIP': 'processing', 'PICKUP PENDING': 'processing',
    'PICKED UP': 'shipped', 'IN TRANSIT': 'shipped', 'OUT FOR DELIVERY': 'out_for_delivery',
    'DELIVERED': 'delivered', 'RTO INITIATED': 'return_requested', 'RTO DELIVERED': 'returned',
    'CANCELLED': 'cancelled',
  }
  return map[srStatus.toUpperCase()] ?? 'processing'
}
