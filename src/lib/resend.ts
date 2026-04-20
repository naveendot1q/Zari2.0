import { Resend } from 'resend'
import type { Order, Profile } from '@/types'
import { formatPaise } from './stripe'

export const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

// ─── Email Templates ──────────────────────────────────────────────────────────

function baseTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #faf9f7; margin: 0; padding: 0; color: #1a1a1a; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #ede9e3; }
    .header { background: #1a1a1a; padding: 32px; text-align: center; }
    .header h1 { color: #e8c97a; font-size: 28px; letter-spacing: 6px; margin: 0; font-weight: 400; }
    .header p { color: #9e9e9e; font-size: 12px; letter-spacing: 2px; margin: 8px 0 0; text-transform: uppercase; }
    .body { padding: 40px; }
    .order-box { background: #faf9f7; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .item-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ede9e3; font-size: 14px; }
    .item-row:last-child { border-bottom: none; }
    .total-row { display: flex; justify-content: space-between; padding: 12px 0; font-weight: 600; font-size: 16px; border-top: 2px solid #1a1a1a; margin-top: 8px; }
    .btn { display: inline-block; background: #1a1a1a; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 14px; letter-spacing: 1px; margin: 24px 0; }
    .footer { background: #faf9f7; padding: 24px 40px; font-size: 12px; color: #9e9e9e; text-align: center; border-top: 1px solid #ede9e3; }
    h2 { font-size: 20px; font-weight: 500; margin: 0 0 8px; }
    p { line-height: 1.7; color: #555; font-size: 14px; }
    .address { font-style: normal; font-size: 14px; line-height: 1.8; color: #555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ZARI</h1>
      <p>Women's Fashion</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Zari. Made with love in India.</p>
      <p><a href="${APP_URL}" style="color:#9e9e9e;">Visit our store</a> · <a href="${APP_URL}/contact" style="color:#9e9e9e;">Contact us</a></p>
    </div>
  </div>
</body>
</html>`
}

function orderItemsHtml(order: Order) {
  const items = (order.items || []).map(item => `
    <div class="item-row">
      <span>${item.product_name}${item.variant_label ? ` <small style="color:#999">(${item.variant_label})</small>` : ''} × ${item.quantity}</span>
      <span>${formatPaise(item.total)}</span>
    </div>`).join('')

  const rows = `
    <div class="item-row"><span>Subtotal</span><span>${formatPaise(order.subtotal)}</span></div>
    ${order.discount > 0 ? `<div class="item-row" style="color:#2e7d32"><span>Discount</span><span>-${formatPaise(order.discount)}</span></div>` : ''}
    <div class="item-row"><span>Shipping</span><span>${order.shipping_charge === 0 ? 'Free' : formatPaise(order.shipping_charge)}</span></div>
    <div class="item-row"><span>GST (5%)</span><span>${formatPaise(order.tax)}</span></div>
    <div class="total-row"><span>Total</span><span>${formatPaise(order.total)}</span></div>`

  return `<div class="order-box">${items}${rows}</div>`
}

// ─── Send Functions ───────────────────────────────────────────────────────────

export async function sendOrderConfirmation(order: Order, profile: Profile) {
  const addr = order.shipping_address
  const content = `
    <h2>Order Confirmed! 🎉</h2>
    <p>Hi ${profile.full_name || 'there'}, your order has been placed successfully.</p>
    <p><strong>Order Number:</strong> ${order.order_number}</p>
    <p><strong>Payment:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Paid Online'}</p>
    ${orderItemsHtml(order)}
    <p><strong>Delivering to:</strong></p>
    <address class="address">
      ${addr.full_name}<br>
      ${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}<br>
      ${addr.city}, ${addr.state} - ${addr.pincode}<br>
      📞 ${addr.phone}
    </address>
    <p>We'll send you another email when your order ships. Estimated delivery: <strong>3–7 business days</strong>.</p>
    <a href="${APP_URL}/orders/${order.id}" class="btn">Track Your Order</a>`

  await resend.emails.send({
    from: FROM,
    to: profile.email,
    subject: `Order Confirmed: ${order.order_number} — Zari`,
    html: baseTemplate(content),
  })
}

export async function sendShippingUpdate(order: Order, profile: Profile) {
  const content = `
    <h2>Your order is on its way! 📦</h2>
    <p>Hi ${profile.full_name || 'there'}, your order <strong>${order.order_number}</strong> has been shipped.</p>
    ${order.courier_name ? `<p><strong>Courier:</strong> ${order.courier_name}</p>` : ''}
    ${order.awb_code ? `<p><strong>AWB / Tracking Number:</strong> ${order.awb_code}</p>` : ''}
    ${order.tracking_url ? `<a href="${order.tracking_url}" class="btn">Track Shipment</a>` : ''}
    <p>Please allow up to 24 hours for tracking to update. Expected delivery in <strong>2–5 business days</strong>.</p>
    <a href="${APP_URL}/orders/${order.id}" class="btn">View Order</a>`

  await resend.emails.send({
    from: FROM,
    to: profile.email,
    subject: `Shipped: ${order.order_number} — Zari`,
    html: baseTemplate(content),
  })
}

export async function sendDeliveryConfirmation(order: Order, profile: Profile) {
  const content = `
    <h2>Delivered! 🥳</h2>
    <p>Hi ${profile.full_name || 'there'}, your order <strong>${order.order_number}</strong> has been delivered.</p>
    <p>We hope you love your new pieces! If you have any issues, please contact us within 7 days.</p>
    <a href="${APP_URL}/orders/${order.id}/review" class="btn">Leave a Review</a>`

  await resend.emails.send({
    from: FROM,
    to: profile.email,
    subject: `Delivered: ${order.order_number} — Zari`,
    html: baseTemplate(content),
  })
}

export async function sendWelcomeEmail(profile: Profile) {
  const content = `
    <h2>Welcome to Zari ✨</h2>
    <p>Hi ${profile.full_name || 'there'}, we're so glad to have you!</p>
    <p>Discover the finest women's fashion — kurtas, sarees, lehengas, and more, delivered straight to your door.</p>
    <a href="${APP_URL}/shop/products" class="btn">Start Shopping</a>
    <p style="margin-top:24px; font-size:12px; color:#aaa;">Follow us on Instagram for styling inspiration and early access to new collections.</p>`

  await resend.emails.send({
    from: FROM,
    to: profile.email,
    subject: 'Welcome to Zari — Discover Your Style',
    html: baseTemplate(content),
  })
}

export async function sendAbandonedCartEmail(
  email: string,
  name: string,
  items: { name: string; image: string; price: number }[]
) {
  const itemsHtml = items.slice(0, 3).map(i => `
    <div style="display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid #ede9e3">
      <img src="${i.image}" style="width:64px;height:64px;object-fit:cover;border-radius:6px">
      <div>
        <div style="font-size:14px;font-weight:500">${i.name}</div>
        <div style="font-size:13px;color:#999">${formatPaise(i.price)}</div>
      </div>
    </div>`).join('')

  const content = `
    <h2>You left something behind 💛</h2>
    <p>Hi ${name || 'there'}, your cart is waiting for you!</p>
    <div class="order-box">${itemsHtml}</div>
    <a href="${APP_URL}/cart" class="btn">Complete Your Order</a>
    <p style="font-size:12px;color:#aaa;margin-top:16px">Free shipping on orders above ₹500. Easy 7-day returns.</p>`

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Your Zari cart is waiting ✨',
    html: baseTemplate(content),
  })
}
