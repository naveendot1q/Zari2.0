import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { NewProductForm } from '@/components/admin/NewProductForm'

export default async function NewProductPage() {
  const { userId } = await auth()
  if (!userId) redirect('/auth/sign-in')
  const { data: pd } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  const profile = pd as { role: string } | null
  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: categories } = await supabaseAdmin
    .from('categories').select('id, name').eq('is_active', true).order('sort_order')

  return (
    <div className="flex min-h-screen bg-[#faf9f7]">
      <AdminSidebar />
      <NewProductForm categories={(categories ?? []) as { id: string; name: string }[]} />
    </div>
  )
}
