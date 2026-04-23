import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { formatPaise } from '@/lib/stripe'

async function getStats() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [
    { count: totalOrders },
    { count: pendingOrders },
    { data: revenueData },
    { count: totalProducts },
    { count: newCustomers },
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'confirmed', 'processing']),
    supabaseAdmin.from('orders').select('total').eq('payment_status', 'paid').gte('created_at', thirtyDaysAgo),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
  ])
  const revenue = (revenueData ?? []).reduce((sum, o) => sum + ((o as Record<string, unknown>).total as number), 0)
  return { totalOrders, pendingOrders, revenue, totalProducts, newCustomers }
}

async function getRecentOrders() {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, total, status, payment_method, created_at, profile:profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

export default async function AdminDashboard() {
  const { userId } = auth()
  if (!userId) redirect('/auth/sign-in')

  const { data: pd } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  const profileData = pd as { role: string } | null
  if (!profileData || profileData.role !== 'admin') redirect('/')

  const [stats, recentOrders] = await Promise.all([getStats(), getRecentOrders()])

  const statCards = [
    { label: '30-day Revenue', value: formatPaise(stats.revenue), color: '#e8c97a' },
    { label: 'Orders (30d)', value: String(stats.totalOrders ?? 0), color: '#86efac' },
    { label: 'Pending Orders', value: String(stats.pendingOrders ?? 0), color: '#fca5a5' },
    { label: 'Active Products', value: String(stats.totalProducts ?? 0), color: '#93c5fd' },
    { label: 'New Customers (30d)', value: String(stats.newCustomers ?? 0), color: '#c4b5fd' },
  ]

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    shipped: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div className="flex min-h-screen bg-[#faf9f7]">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>Dashboard</h1>
          <p className="text-sm text-[#999] mt-1">Welcome back. Here&apos;s what&apos;s happening.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {statCards.map(card => (
            <div key={card.label} className="bg-white border border-[#ede9e3] rounded-lg p-4">
              <div className="w-2 h-2 rounded-full mb-3" style={{ background: card.color }} />
              <p className="text-2xl font-medium">{card.value}</p>
              <p className="text-xs text-[#999] mt-1">{card.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-white border border-[#ede9e3] rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[#ede9e3] flex justify-between items-center">
            <h2 className="font-medium">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-[#888] hover:text-[#1a1a1a]">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#faf9f7]">
                <tr>
                  {['Order', 'Customer', 'Total', 'Payment', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-[#999] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ede9e3]">
                {recentOrders.map((order) => {
                  const o = order as Record<string, unknown>
                  const prof = o.profile as Record<string, unknown> | null
                  return (
                    <tr key={o.id as string} className="hover:bg-[#faf9f7] transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_number as string}</Link>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium">{(prof?.full_name as string) ?? '—'}</p>
                        <p className="text-xs text-[#999]">{prof?.email as string}</p>
                      </td>
                      <td className="px-6 py-4">{formatPaise(o.total as number)}</td>
                      <td className="px-6 py-4"><span className="text-xs uppercase">{o.payment_method as string}</span></td>
                      <td className="px-6 py-4">
                        <span className={`badge text-[10px] uppercase ${statusColors[o.status as string] ?? 'bg-gray-100 text-gray-600'}`}>
                          {(o.status as string).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#888] text-xs">
                        {new Date(o.created_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
