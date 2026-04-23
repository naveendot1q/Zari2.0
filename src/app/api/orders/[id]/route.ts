import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*, profile:profiles(*), items:order_items(*, product:products(name, images, slug))')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: pd } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  const profile = pd as { role: string } | null

  if (profile?.role !== 'admin' && (order as Record<string, unknown>).user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ order })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: pd } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  const profile = pd as { role: string } | null
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as Record<string, unknown>
  const allowed = ['status', 'payment_status', 'tracking_url', 'awb_code', 'courier_name', 'notes']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of allowed) {
    if (body[field] !== undefined) updates[field] = body[field]
  }

  const { data, error } = await supabaseAdmin
    .from('orders').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ order: data })
}
