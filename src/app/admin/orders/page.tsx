import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { formatPaise } from '@/lib/stripe'
import { AdminOrderActions } from '@/components/admin/AdminOrderActions'

interface Props {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { userId } = await auth()
  if (!userId) redirect('/auth/sign-in')
  const { data: profileData } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  const profile = profileData as { role: string } | null
  if (!profile || profile.role !== 'admin') redirect('/')

  const sp = await searchParams
  const page = Number(sp.page || 1)
  const perPage = 20
  const status = sp.status
  const q = sp.q

  let query = supabaseAdmin
    .from('orders')
    .select('*, profile:profiles(full_name, email, phone), items:order_items(id)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (status) query = query.eq('status', status)
  if (q) query = query.ilike('order_number', `%${q}%`)

  const { data: orders, count } = await query
  const totalPages = Math.ceil((count || 0) / perPage)

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

  const ALL_STATUSES = ['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','returned']

  return (
    <div className="flex min-h-screen bg-[#faf9f7]">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>Orders</h1>
            <p className="text-sm text-[#999] mt-1">{count} total orders</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Link href="/admin/orders"
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${!status ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'border-[#ede9e3] text-[#666] hover:border-[#999]'}`}>
            All
          </Link>
          {ALL_STATUSES.map(s => (
            <Link key={s} href={`/admin/orders?status=${s}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${status === s ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'border-[#ede9e3] text-[#666] hover:border-[#999]'}`}>
              {s.replace(/_/g, ' ')}
            </Link>
          ))}
        </div>

        <div className="bg-white border border-[#ede9e3] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#faf9f7]">
                <tr>
                  {['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-[#999] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ede9e3]">
                {(orders || []).map((order: any) => (
                  <tr key={order.id} className="hover:bg-[#faf9f7] transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline text-sm">
                        {order.order_number}
                      </Link>
                      {order.payment_method === 'cod' && (
                        <p className="text-[10px] text-orange-500 mt-0.5">COD</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-sm">{order.profile?.full_name || '—'}</p>
                      <p className="text-xs text-[#999]">{order.profile?.email}</p>
                      <p className="text-xs text-[#999]">{order.profile?.phone}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#666]">{order.items?.length || 0} items</td>
                    <td className="px-5 py-4 font-medium text-sm">{formatPaise(order.total)}</td>
                    <td className="px-5 py-4">
                      <span className={`badge text-[10px] ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : order.payment_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge text-[10px] ${statusColors[order.status] || ''}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#888]">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-5 py-4">
                      <AdminOrderActions orderId={order.id} currentStatus={order.status} awbCode={order.awb_code} trackingUrl={order.tracking_url} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-[#ede9e3] flex justify-between items-center">
              <p className="text-xs text-[#999]">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 && <Link href={`/admin/orders?page=${page - 1}${status ? `&status=${status}` : ''}`} className="text-xs px-3 py-1.5 border border-[#ede9e3] hover:bg-[#f5f0e8]">← Prev</Link>}
                {page < totalPages && <Link href={`/admin/orders?page=${page + 1}${status ? `&status=${status}` : ''}`} className="text-xs px-3 py-1.5 border border-[#ede9e3] hover:bg-[#f5f0e8]">Next →</Link>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
