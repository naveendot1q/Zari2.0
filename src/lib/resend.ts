import type { Order, Profile } from '@/types'
import { formatPaise } from './stripe'

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  const { Resend } = require('resend') as typeof import('resend')
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM = `${process.env.RESEND_FROM_NAME ?? 'Zari'} <${process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com'}>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3000'

function baseTemplate(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;background:#faf9f7;margin:0;padding:0;color:#1a1a1a}
.container{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #ede9e3}
.header{background:#1a1a1a;padding:32px;text-align:center}
.header h1{color:#e8c97a;font-size:28px;letter-spacing:6px;margin:0;font-weight:400}
.body{padding:40px}.btn{display:inline-block;background:#1a1a1a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:14px;margin:24px 0}
.footer{background:#faf9f7;padding:24px;font-size:12px;color:#9e9e9e;text-align:center}
p{line-height:1.7;color:#555;font-size:14px}
</style></head><body><div class="container">
<div class="header"><h1>ZARI</h1></div>
<div class="body">${content}</div>
<div class="footer"><p>© ${new Date().getFullYear()} Zari. Made with love in India.</p></div>
</div></body></html>`
}

async function sendEmail(to: string, subject: string, html: string) {
  const resend = getResend()
  if (!resend) { console.log('Resend not configured, skipping email:', subject); return }
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) { console.error('Email send error:', err) }
}

export async function sendOrderConfirmation(order: Order, profile: Profile) {
  const addr = order.shipping_address
  await sendEmail(profile.email, `Order Confirmed: ${order.order_number} — Zari`, baseTemplate(`
    <h2>Order Confirmed! 🎉</h2>
    <p>Hi ${profile.full_name ?? 'there'}, your order <strong>${order.order_number}</strong> has been placed.</p>
    <p><strong>Payment:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Paid Online'}</p>
    <p><strong>Total:</strong> ${formatPaise(order.total)}</p>
    <p><strong>Delivering to:</strong><br>${addr.full_name}, ${addr.line1}, ${addr.city}, ${addr.state} – ${addr.pincode}</p>
    <a href="${APP_URL}/shop/orders/${order.id}" class="btn">Track Your Order</a>`))
}

export async function sendShippingUpdate(order: Order, profile: Profile) {
  await sendEmail(profile.email, `Shipped: ${order.order_number} — Zari`, baseTemplate(`
    <h2>Your order is on its way! 📦</h2>
    <p>Hi ${profile.full_name ?? 'there'}, order <strong>${order.order_number}</strong> has shipped.</p>
    ${order.awb_code ? `<p><strong>AWB:</strong> ${order.awb_code}</p>` : ''}
    ${order.tracking_url ? `<a href="${order.tracking_url}" class="btn">Track Shipment</a>` : ''}
    <a href="${APP_URL}/shop/orders/${order.id}" class="btn">View Order</a>`))
}

export async function sendDeliveryConfirmation(order: Order, profile: Profile) {
  await sendEmail(profile.email, `Delivered: ${order.order_number} — Zari`, baseTemplate(`
    <h2>Delivered! 🥳</h2>
    <p>Hi ${profile.full_name ?? 'there'}, order <strong>${order.order_number}</strong> has been delivered.</p>
    <a href="${APP_URL}/shop/orders/${order.id}/review" class="btn">Leave a Review</a>`))
}

export async function sendWelcomeEmail(profile: Profile) {
  await sendEmail(profile.email, 'Welcome to Zari ✨', baseTemplate(`
    <h2>Welcome to Zari ✨</h2>
    <p>Hi ${profile.full_name ?? 'there'}, we&apos;re so glad to have you!</p>
    <p>Discover the finest women&apos;s fashion — kurtas, sarees, lehengas, and more.</p>
    <a href="${APP_URL}/shop/products" class="btn">Start Shopping</a>`))
}

export async function sendAbandonedCartEmail(email: string, name: string, items: { name: string; image: string; price: number }[]) {
  const itemsHtml = items.slice(0, 3).map(i => `<p>${i.name} — ${formatPaise(i.price)}</p>`).join('')
  await sendEmail(email, 'Your Zari cart is waiting ✨', baseTemplate(`
    <h2>You left something behind 💛</h2>
    <p>Hi ${name}, your cart is waiting!</p>
    ${itemsHtml}
    <a href="${APP_URL}/shop/cart" class="btn">Complete Your Order</a>`))
}
