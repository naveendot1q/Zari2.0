import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createCheckoutSession, calculateOrderTotals } from '@/lib/stripe'
import { createShiprocketOrder, generateAWB, requestPickup } from '@/lib/shiprocket'
import { sendOrderConfirmation } from '@/lib/resend'
import { checkoutRateLimit } from '@/lib/upstash'
import type { Order, Profile, AddressSnapshot } from '@/types'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const { success } = await checkoutRateLimit.limit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    address: AddressSnapshot
    payment_method: 'stripe' | 'cod'
    coupon_code?: string
    notes?: string
  }
  const { address, payment_method, coupon_code, notes } = body

  const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: cartItems } = await supabaseAdmin
    .from('cart_items')
    .select('*, product:products(*, category:categories(*), variants:product_variants(*))')
    .eq('user_id', userId)

  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  let subtotal = 0
  for (const item of cartItems) {
    const product = item.product as Record<string, unknown> | null
    if (!product) return NextResponse.json({ error: 'Product unavailable' }, { status: 400 })
    const variants = (product.variants as { id: string; stock: number; price_modifier: number }[]) ?? []
    const variant = item.variant_id ? variants.find((v) => v.id === item.variant_id) : null
    const stock = variant ? variant.stock : (product.total_stock as number ?? 0)
    if (stock < item.quantity) {
      return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 })
    }
    const price = (product.price as number) + (variant?.price_modifier ?? 0)
    subtotal += price * item.quantity
  }

  let couponDiscount = 0
  let coupon: Record<string, unknown> | null = null
  if (coupon_code) {
    const { data: c } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', coupon_code.toUpperCase())
      .eq('is_active', true)
      .gte('valid_until', new Date().toISOString())
      .single()
    if (c) {
      const minVal = c.min_order_value as number | null
      const usageLimit = c.usage_limit as number | null
      const usedCount = c.used_count as number
      if ((!minVal || subtotal >= minVal) && (!usageLimit || usedCount < usageLimit)) {
        couponDiscount = c.type === 'percentage'
          ? Math.round(subtotal * (c.value as number) / 100)
          : (c.value as number)
        const maxDiscount = c.max_discount as number | null
        if (maxDiscount) couponDiscount = Math.min(couponDiscount, maxDiscount)
        coupon = c as Record<string, unknown>
      }
    }
  }

  const totals = calculateOrderTotals(subtotal, couponDiscount)

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: userId,
      status: 'pending',
      payment_status: 'pending',
      payment_method,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping_charge: totals.shipping,
      tax: totals.tax,
      total: totals.total,
      coupon_code: coupon ? coupon_code : null,
      shipping_address: address,
      billing_address: address,
      notes: notes ?? null,
    })
    .select('*')
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  const orderItems = []
  for (const item of cartItems) {
    const product = item.product as Record<string, unknown>
    const variants = (product.variants as { id: string; stock: number; price_modifier: number }[]) ?? []
    const variant = item.variant_id ? variants.find((v) => v.id === item.variant_id) : null
    const price = (product.price as number) + (variant?.price_modifier ?? 0)
    orderItems.push({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      product_name: product.name as string,
      variant_label: variant ? `${(variant as Record<string, unknown>).size} / ${(variant as Record<string, unknown>).color}` : null,
      image_url: ((product.images as string[]) ?? [])[0] ?? '',
      quantity: item.quantity,
      price,
      total: price * item.quantity,
    })
    if (variant) {
      await supabaseAdmin
        .from('product_variants')
        .update({ stock: variant.stock - item.quantity })
        .eq('id', variant.id)
    }
  }

  await supabaseAdmin.from('order_items').insert(orderItems)

  if (coupon) {
    await supabaseAdmin
      .from('coupons')
      .update({ used_count: (coupon.used_count as number) + 1 })
      .eq('id', coupon.id)
  }

  await supabaseAdmin.from('cart_items').delete().eq('user_id', userId)

  const { data: fullOrder } = await supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', order.id)
    .single()

  const orderWithItems = { ...(fullOrder as Record<string, unknown>), items: (fullOrder as Record<string, unknown>)?.items } as unknown as Order

  if (payment_method === 'stripe') {
    const session = await createCheckoutSession(orderWithItems, (profile as Profile).email)
    await supabaseAdmin.from('orders').update({ stripe_payment_link: session.url }).eq('id', order.id)
    return NextResponse.json({ order_id: order.id, checkout_url: session.url })
  } else {
    await supabaseAdmin.from('orders').update({ status: 'confirmed' }).eq('id', order.id)
    try {
      const sr = await createShiprocketOrder(orderWithItems)
      const awb = await generateAWB(sr.shipment_id)
      await requestPickup(sr.shipment_id)
      await supabaseAdmin.from('orders').update({
        shiprocket_order_id: sr.shiprocket_order_id,
        shiprocket_shipment_id: sr.shipment_id,
        awb_code: awb,
        status: 'processing',
      }).eq('id', order.id)
    } catch (err) { console.error('Shiprocket error:', err) }
    try {
      await sendOrderConfirmation(orderWithItems, profile as Profile)
    } catch (err) { console.error('Email error:', err) }
    return NextResponse.json({ order_id: order.id })
  }
}

export async function GET(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const page = Number(url.searchParams.get('page') ?? 1)
  const per_page = 10

  const { data, count } = await supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*, product:products(name, images, slug))', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range((page - 1) * per_page, page * per_page - 1)

  return NextResponse.json({ data, total: count, page, per_page, total_pages: Math.ceil((count ?? 0) / per_page) })
}
