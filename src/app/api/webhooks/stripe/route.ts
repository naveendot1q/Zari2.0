import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { createShiprocketOrder, generateAWB, requestPickup } from '@/lib/shiprocket'
import { sendOrderConfirmation } from '@/lib/resend'
import type Stripe from 'stripe'
import type { Order, Profile } from '@/types'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.order_id
      if (!orderId) return NextResponse.json({ received: true })

      const { data: order } = await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'paid', status: 'confirmed', stripe_payment_intent_id: session.payment_intent as string })
        .eq('id', orderId)
        .select('*, items:order_items(*)')
        .single()

      if (!order) return NextResponse.json({ received: true })

      const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', order.user_id).single()
      if (profile) {
        await sendOrderConfirmation({ ...order, items: (order as Record<string, unknown>).items } as unknown as Order, profile as Profile)
      }

      try {
        const sr = await createShiprocketOrder({ ...order, items: (order as Record<string, unknown>).items } as unknown as Order)
        const awb = await generateAWB(sr.shipment_id)
        await requestPickup(sr.shipment_id)
        await supabaseAdmin.from('orders').update({
          shiprocket_order_id: sr.shiprocket_order_id,
          shiprocket_shipment_id: sr.shipment_id,
          awb_code: awb,
          status: 'processing',
        }).eq('id', orderId)
      } catch (err) { console.error('Shiprocket error:', err) }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent
      const orderId = pi.metadata?.order_id
      if (orderId) {
        await supabaseAdmin.from('orders').update({ payment_status: 'failed', status: 'cancelled' }).eq('id', orderId)
      }
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      const pi = charge.payment_intent as string
      if (pi) {
        await supabaseAdmin.from('orders')
          .update({ payment_status: 'refunded', status: 'returned' })
          .eq('stripe_payment_intent_id', pi)
      }
    }
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}