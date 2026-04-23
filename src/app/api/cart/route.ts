import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ items: [] })

  const { data } = await supabaseAdmin
    .from('cart_items')
    .select('*, product:products(*, category:categories(*)), variant:product_variants(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { product_id, variant_id, quantity = 1 } = await req.json() as {
    product_id: string
    variant_id?: string
    quantity?: number
  }

  if (variant_id) {
    const { data: variant } = await supabaseAdmin
      .from('product_variants').select('stock').eq('id', variant_id).single()
    const v = variant as { stock: number } | null
    if (!v || v.stock < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('cart_items')
    .upsert(
      { user_id: userId, product_id, variant_id: variant_id ?? null, quantity },
      { onConflict: 'user_id,product_id,variant_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await supabaseAdmin.from('cart_items').delete().eq('user_id', userId)
  return NextResponse.json({ success: true })
}
