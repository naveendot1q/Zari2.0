import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { quantity } = await req.json() as { quantity: number }

  if (quantity <= 0) {
    await supabaseAdmin.from('cart_items').delete().eq('id', id).eq('user_id', userId)
    return NextResponse.json({ success: true })
  }

  const { data } = await supabaseAdmin
    .from('cart_items').update({ quantity }).eq('id', id).eq('user_id', userId).select().single()
  return NextResponse.json({ item: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await supabaseAdmin.from('cart_items').delete().eq('id', id).eq('user_id', userId)
  return NextResponse.json({ success: true })
}
