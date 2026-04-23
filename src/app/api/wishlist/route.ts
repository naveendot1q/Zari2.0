import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ items: [] })

  const { data } = await supabaseAdmin
    .from('wishlists')
    .select('*, product:products(*, category:categories(*), variants:product_variants(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { product_id } = await req.json() as { product_id: string }
  await supabaseAdmin.from('wishlists').upsert({ user_id: userId, product_id })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { product_id } = await req.json() as { product_id: string }
  await supabaseAdmin.from('wishlists').delete().eq('user_id', userId).eq('product_id', product_id)
  return NextResponse.json({ success: true })
}
