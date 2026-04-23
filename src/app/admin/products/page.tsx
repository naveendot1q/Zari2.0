import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminProductsTable } from '@/components/admin/AdminProductsTable'

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function AdminProductsPage({ searchParams }: Props) {
  const { userId } = auth()
  if (!userId) redirect('/auth/sign-in')
  const { data: profileData } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  const profile = profileData as { role: string } | null
  if (!profile || profile.role !== 'admin') redirect('/')

  const sp = await searchParams
  const page = Number(sp.page || 1)
  const q = sp.q || ''
  const perPage = 20

  let query = supabaseAdmin
    .from('products')
    .select('*, category:categories(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (q) query = query.ilike('name', `%${q}%`)

  const { data: products, count } = await query
  const totalPages = Math.ceil((count || 0) / perPage)

  return (
    <div className="flex min-h-screen bg-[#faf9f7]">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>Products</h1>
            <p className="text-sm text-[#999] mt-1">{count} total products</p>
          </div>
          <Link href="/admin/products/new" className="btn-primary">+ Add Product</Link>
        </div>
        <form className="mb-6">
          <input name="q" defaultValue={q} placeholder="Search products..." className="input max-w-xs" />
        </form>
        <AdminProductsTable products={products || []} page={page} totalPages={totalPages} />
      </main>
    </div>
  )
}
