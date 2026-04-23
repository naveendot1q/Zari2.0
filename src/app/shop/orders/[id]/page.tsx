import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { OrderTrackingTimeline } from '@/components/shop/OrderTrackingTimeline'
import { supabaseAdmin } from '@/lib/supabase'
import { formatPaise } from '@/lib/stripe'
import type { Order } from '@/types'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ placed?: string; payment?: string }>
}

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { userId } = await auth()
  if (!userId) redirect('/auth/sign-in')

  const { id } = await params
  const sp = await searchParams

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*, product:products(name, images, slug))')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const { data: profileData } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  const profile = profileData as { role: string } | null

  if (order.user_id !== userId && profile?.role !== 'admin') {
    redirect('/shop/orders')
  }

  const justPlaced = sp.placed === 'true'
  const paymentSuccess = sp.payment === 'success'
  const o = order as Order

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="section py-8 md:py-12 max-w-4xl">

          {(justPlaced || paymentSuccess) && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8 flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 text-lg">✓</div>
              <div>
                <p className="font-medium text-green-800">
                  {paymentSuccess ? 'Payment successful!' : 'Order placed successfully!'}
                </p>
                <p className="text-sm text-green-700 mt-0.5">
                  {o.payment_method === 'cod'
                    ? "Your COD order is confirmed. We'll dispatch it shortly."
                    : 'Payment received. Your order is being processed.'}
                  {' '}A confirmation email has been sent to you.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <p className="text-xs text-[#999] mb-1">
                <Link href="/shop/orders" className="hover:text-[#1a1a1a] transition-colors">Orders</Link> →
              </p>
              <h1 className="text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>{o.order_number}</h1>
              <p className="text-sm text-[#888] mt-1">
                Placed on {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            {o.tracking_url && (
              <a href={o.tracking_url} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm py-2 px-4">
                Track Shipment →
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-[#ede9e3] rounded-xl p-6">
                <h2 className="font-medium mb-5 text-sm uppercase tracking-wider text-[#999]">Order Status</h2>
                <OrderTrackingTimeline
                  status={o.status}
                  paymentMethod={o.payment_method}
                  awbCode={o.awb_code || undefined}
                  courierName={o.courier_name || undefined}
                  trackingUrl={o.tracking_url || undefined}
                  createdAt={o.created_at}
                  updatedAt={o.updated_at}
                />
              </div>

              <div className="bg-white border border-[#ede9e3] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#ede9e3]">
                  <h2 className="font-medium text-sm uppercase tracking-wider text-[#999]">
                    Items ({(o.items || []).length})
                  </h2>
                </div>
                <div className="divide-y divide-[#ede9e3]">
                  {(o.items || []).map((item: any) => (
                    <div key={item.id} className="flex gap-4 p-5">
                      <div className="w-16 flex-shrink-0 bg-[#f5f0e8] rounded-lg overflow-hidden" style={{ height: '88px' }}>
                        {item.product?.images?.[0] ? (
                          <Image src={item.product.images[0]} alt={item.product_name} width={64} height={88} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#ccc] text-xs">No img</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/shop/product/${item.product?.slug}`} className="font-medium text-sm hover:opacity-70 transition-opacity leading-snug">
                          {item.product_name}
                        </Link>
                        {item.variant_label && <p className="text-xs text-[#888] mt-0.5">{item.variant_label}</p>}
                        <p className="text-xs text-[#888] mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium">{formatPaise(item.total)}</p>
                        <p className="text-xs text-[#bbb] mt-0.5">{formatPaise(item.price)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#ede9e3] rounded-xl p-6">
                <h2 className="font-medium text-sm uppercase tracking-wider text-[#999] mb-4">Delivery Address</h2>
                <address className="not-italic text-sm leading-relaxed text-[#555]">
                  <p className="font-medium text-[#1a1a1a]">{o.shipping_address.full_name}</p>
                  <p>{o.shipping_address.line1}</p>
                  {o.shipping_address.line2 && <p>{o.shipping_address.line2}</p>}
                  <p>{o.shipping_address.city}, {o.shipping_address.state} – {o.shipping_address.pincode}</p>
                  <p className="mt-1">📞 {o.shipping_address.phone}</p>
                </address>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-[#ede9e3] rounded-xl p-6">
                <h2 className="font-medium text-sm uppercase tracking-wider text-[#999] mb-4">Order Summary</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#666]">Subtotal</span><span>{formatPaise(o.subtotal)}</span></div>
                  {o.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount {o.coupon_code && `(${o.coupon_code})`}</span>
                      <span>−{formatPaise(o.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between"><span className="text-[#666]">Shipping</span><span>{o.shipping_charge === 0 ? 'Free' : formatPaise(o.shipping_charge)}</span></div>
                  <div className="flex justify-between"><span className="text-[#666]">GST (5%)</span><span>{formatPaise(o.tax)}</span></div>
                  <div className="flex justify-between font-medium text-base pt-2 border-t border-[#ede9e3]">
                    <span>Total</span><span>{formatPaise(o.total)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#ede9e3] rounded-xl p-6">
                <h2 className="font-medium text-sm uppercase tracking-wider text-[#999] mb-4">Payment</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#666]">Method</span>
                    <span>{o.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#666]">Status</span>
                    <span className={`badge text-xs ${
                      o.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                      o.payment_status === 'failed' ? 'bg-red-100 text-red-700' :
                      o.payment_status === 'refunded' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{o.payment_status}</span>
                  </div>
                </div>
              </div>

              {(o.awb_code || o.courier_name) && (
                <div className="bg-white border border-[#ede9e3] rounded-xl p-6">
                  <h2 className="font-medium text-sm uppercase tracking-wider text-[#999] mb-4">Shipment</h2>
                  <div className="space-y-2 text-sm">
                    {o.courier_name && <div className="flex justify-between"><span className="text-[#666]">Courier</span><span>{o.courier_name}</span></div>}
                    {o.awb_code && <div className="flex justify-between"><span className="text-[#666]">AWB</span><span className="font-mono text-xs">{o.awb_code}</span></div>}
                    {o.tracking_url && (
                      <a href={o.tracking_url} target="_blank" rel="noopener noreferrer"
                        className="block mt-3 text-center text-xs py-2 border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-all duration-200">
                        Track on {o.courier_name || 'courier'} →
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-[#faf9f7] border border-[#ede9e3] rounded-xl p-5 text-center">
                <p className="text-sm text-[#666] mb-2">Need help with this order?</p>
                <Link href="/contact" className="text-sm text-[#1a1a1a] underline hover:opacity-70 transition-opacity">Contact Support</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
