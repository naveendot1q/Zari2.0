import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { supabaseAdmin } from '@/lib/supabase'
import { formatPaise } from '@/lib/stripe'

interface OrderItemRow {
  id: string
  product_name: string
  variant_label: string | null
  quantity: number
  product: { name: string; images: string[]; slug: string } | null
}

interface OrderRow {
  id: string
  order_number: string
  total: number
  status: string
  payment_method: string
  created_at: string
  tracking_url: string | null
  awb_code: string | null
  items: OrderItemRow[]
}

export default async function OrdersPage() {
  const { userId } = await auth()
  if (!userId) redirect('/auth/sign-in')

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, total, status, payment_method, created_at, tracking_url, awb_code, items:order_items(id, product_name, variant_label, quantity, product:products(name, images, slug))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const typedOrders = (orders ?? []) as unknown as OrderRow[]

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    shipped: 'bg-indigo-100 text-indigo-700',
    out_for_delivery: 'bg-orange-100 text-orange-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    return_requested: 'bg-amber-100 text-amber-700',
    returned: 'bg-gray-100 text-gray-600',
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="section py-8 md:py-12 max-w-4xl">
          <h1 className="text-3xl font-light mb-8" style={{ fontFamily: 'var(--font-display)' }}>My Orders</h1>

          {typedOrders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#999] text-lg mb-4">You haven&apos;t placed any orders yet.</p>
              <Link href="/shop/products" className="btn-primary">Start Shopping</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {typedOrders.map(order => (
                <div key={order.id} className="bg-white border border-[#ede9e3] rounded-lg overflow-hidden">
                  {/* Order Header */}
                  <div className="px-5 py-4 bg-[#faf9f7] border-b border-[#ede9e3] flex flex-wrap gap-4 justify-between items-center">
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <p className="text-xs text-[#999] uppercase tracking-wider">Order</p>
                        <p className="text-sm font-medium">{order.order_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#999] uppercase tracking-wider">Date</p>
                        <p className="text-sm">
                          {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#999] uppercase tracking-wider">Total</p>
                        <p className="text-sm font-medium">{formatPaise(order.total)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#999] uppercase tracking-wider">Payment</p>
                        <p className="text-sm">{order.payment_method === 'cod' ? 'COD' : 'Online'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`badge text-xs ${statusColors[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                      <Link href={`/shop/orders/${order.id}`} className="text-xs text-[#888] hover:text-[#1a1a1a] transition-colors">
                        View details →
                      </Link>
                    </div>
                  </div>

                  {/* Items preview */}
                  <div className="px-5 py-4">
                    <div className="flex gap-3">
                      {order.items.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="w-12 h-16 bg-[#f5f0e8] rounded overflow-hidden flex-shrink-0">
                            {item.product?.images?.[0] && (
                              <img
                                src={item.product.images[0]}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium line-clamp-1">{item.product_name}</p>
                            {item.variant_label !== null && item.variant_label !== undefined && (
                              <p className="text-xs text-[#999]">{item.variant_label}</p>
                            )}
                            <p className="text-xs text-[#888]">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="flex items-center">
                          <p className="text-xs text-[#999]">+{order.items.length - 3} more</p>
                        </div>
                      )}
                    </div>

                    {order.tracking_url !== null && order.status === 'shipped' && (
                      <div className="mt-3 pt-3 border-t border-[#ede9e3]">
                        <a
                          href={order.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#1a1a1a] underline hover:opacity-70"
                        >
                          🚚 Track your shipment{order.awb_code ? ` (${order.awb_code})` : ''}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}