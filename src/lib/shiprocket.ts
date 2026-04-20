import axios from 'axios'
import type { Order, ShiprocketOrderPayload } from '@/types'
import { redis } from './upstash'

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external'

async function getToken(): Promise<string> {
  const cached = await redis.get<string>('shiprocket:token')
  if (cached) return cached

  const res = await axios.post(`${BASE_URL}/auth/login`, {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  })
  const token = res.data.token as string
  await redis.set('shiprocket:token', token, { ex: 9 * 24 * 60 * 60 })
  return token
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export async function createShiprocketOrder(order: Order): Promise<{
  shiprocket_order_id: string
  shipment_id: string
}> {
  const token = await getToken()
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
    order_items: (order.items ?? []).map((item) => ({
      name: item.product_name + (item.variant_label ? ` (${item.variant_label})` : ''),
      sku: item.variant_id ?? item.product_id,
      units: item.quantity,
      selling_price: item.price / 100,
      category: 'Women Clothing',
    })),
    payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
    sub_total: order.total / 100,
    length: 30,
    breadth: 25,
    height: 5,
    weight: 0.5,
  }

  const res = await axios.post(`${BASE_URL}/orders/create/adhoc`, payload, {
    headers: authHeaders(token),
  })

  return {
    shiprocket_order_id: String(res.data.order_id),
    shipment_id: String(res.data.shipment_id),
  }
}

export async function generateAWB(shipmentId: string): Promise<string> {
  const token = await getToken()
  const res = await axios.post(
    `${BASE_URL}/courier/assign/awb`,
    { shipment_id: shipmentId },
    { headers: authHeaders(token) }
  )
  return (res.data.response?.data?.awb_code as string) ?? ''
}

export async function requestPickup(shipmentId: string): Promise<void> {
  const token = await getToken()
  await axios.post(
    `${BASE_URL}/courier/generate/pickup`,
    { shipment_id: [shipmentId] },
    { headers: authHeaders(token) }
  )
}

export async function trackShipment(awbCode: string) {
  const token = await getToken()
  const res = await axios.get(`${BASE_URL}/courier/track/awb/${awbCode}`, {
    headers: authHeaders(token),
  })
  return res.data.tracking_data
}

export async function cancelShiprocketOrder(orderId: string): Promise<void> {
  const token = await getToken()
  await axios.post(
    `${BASE_URL}/orders/cancel`,
    { ids: [orderId] },
    { headers: authHeaders(token) }
  )
}

export function mapShiprocketStatus(srStatus: string): string {
  const map: Record<string, string> = {
    'NEW': 'confirmed',
    'READY TO SHIP': 'processing',
    'PICKUP PENDING': 'processing',
    'PICKED UP': 'shipped',
    'IN TRANSIT': 'shipped',
    'OUT FOR DELIVERY': 'out_for_delivery',
    'DELIVERED': 'delivered',
    'RTO INITIATED': 'return_requested',
    'RTO DELIVERED': 'returned',
    'CANCELLED': 'cancelled',
  }
  return map[srStatus.toUpperCase()] ?? 'processing'
}
