import Stripe from 'stripe'
import type { Order } from '@/types'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export const CURRENCY = 'inr'
export const FREE_SHIPPING_THRESHOLD = 50000
export const SHIPPING_CHARGE = 7900
export const GST_RATE = 0.05

export function calculateOrderTotals(subtotalPaise: number, couponDiscount = 0) {
  const discountedSubtotal = Math.max(0, subtotalPaise - couponDiscount)
  const shipping = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE
  const tax = Math.round(discountedSubtotal * GST_RATE)
  const total = discountedSubtotal + shipping + tax
  return { subtotal: subtotalPaise, discount: couponDiscount, shipping, tax, total }
}

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(paise / 100)
}

export async function createCheckoutSession(order: Order, customerEmail: string) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: CURRENCY,
    customer_email: customerEmail,
    payment_method_types: ['card'],
    line_items: (order.items || []).map((item) => ({
      price_data: {
        currency: CURRENCY,
        product_data: {
          name: item.product_name,
          description: item.variant_label || undefined,
          images: item.image_url ? [item.image_url] : [],
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    })),
    shipping_options: order.shipping_charge > 0
      ? [{ shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: order.shipping_charge, currency: CURRENCY },
          display_name: 'Standard Shipping',
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 3 },
            maximum: { unit: 'business_day', value: 7 },
          },
        }}]
      : [{ shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: 0, currency: CURRENCY },
          display_name: 'Free Shipping',
        }}],
    metadata: { order_id: order.id, order_number: order.order_number },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/shop/orders/${order.id}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/shop/checkout?cancelled=true`,
  })
  return session
}

export async function refundPayment(paymentIntentId: string, amountPaise?: number) {
  return stripe.refunds.create({ payment_intent: paymentIntentId, amount: amountPaise })
}