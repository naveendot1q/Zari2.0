import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { supabaseAdmin } from '@/lib/supabase'
import { formatPaise } from '@/lib/stripe'

export default async function OrdersPage() {
  const { userId } = await auth()
  if (!userId) redirect('/auth/sign-in')

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*, product:products(name, images, slug))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

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
          {!orders || orders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#999] text-lg mb-4">You haven&apos;t placed any orders yet.</p>
              <Link href="/shop/products" className="btn-primary">Start Shopping</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const o = order as Record<string, unknown>
                const items = (o.items as Record<string, unknown>[]) ?? []
                return (
                  <div key={o.id as string} className="bg-white border border-[#ede9e3] rounded-lg overflow-hidden">
                    <div className="px-5 py-4 bg-[#faf9f7] border-b border-[#ede9e3] flex flex-wrap gap-4 justify-between items-center">
                      <div className="flex flex-wrap gap-6">
                        <div>
                          <p className="text-xs text-[#999] uppercase tracking-wider">Order</p>
                          <p className="text-sm font-medium">{o.order_number as string}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#999] uppercase tracking-wider">Date</p>
                          <p className="text-sm">{new Date(o.created_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#999] uppercase tracking-wider">Total</p>
                          <p className="text-sm font-medium">{formatPaise(o.total as number)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#999] uppercase tracking-wider">Payment</p>
                          <p className="text-sm capitalize">{o.payment_method === 'cod' ? 'COD' : 'Online'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`badge text-xs ${statusColors[o.status as string] ?? 'bg-gray-100 text-gray-600'}`}>
                          {(o.status as string).replace(/_/g, ' ')}
                        </span>
                        <Link href={`/shop/orders/${o.id}`} className="text-xs text-[#888] hover:text-[#1a1a1a] transition-colors">
                          View details →
                        </Link>
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <div className="flex gap-3">
                        {items.slice(0, 3).map((item) => {
                          const it = item as Record<string, unknown>
                          const prod = it.product as Record<string, unknown> | null
                          const images = (prod?.images as string[]) ?? []
                          return (
                            <div key={it.id as string} className="flex items-center gap-3">
                              <div className="w-12 h-16 bg-[#f5f0e8] rounded overflow-hidden flex-shrink-0">
                                {images[0] && <img src={images[0]} alt={it.product_name as string} className="w-full h-full object-cover" />}
                              </div>
                              <div>
                                <p className="text-xs font-medium line-clamp-1">{it.product_name as string}</p>
                                {it.variant_label && <p className="text-xs text-[#999]">{it.variant_label as string}</p>}
                                <p className="text-xs text-[#888]">Qty: {it.quantity as number}</p>
                              </div>
                            </div>
                          )
                        })}
                        {items.length > 3 && <div className="flex items-center"><p className="text-xs text-[#999]">+{items.length - 3} more</p></div>}
                      </div>
                      {o.tracking_url && o.status === 'shipped' && (
                        <div className="mt-3 pt-3 border-t border-[#ede9e3]">
                          <a href={o.tracking_url as string} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1a1a1a] underline hover:opacity-70">
                            🚚 Track your shipment {o.awb_code ? `(${o.awb_code})` : ''}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
