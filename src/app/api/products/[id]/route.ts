import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { indexProduct, deleteProductFromIndex } from '@/lib/pinecone'
import { invalidateCache } from '@/lib/upstash'
import type { Product } from '@/types'

async function requireAdmin(): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) return null
  const { data: pd } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  const d = pd as { role: string } | null
  return d?.role === 'admin' ? userId : null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('products').select('*, category:categories(*), variants:product_variants(*)').eq('id', id).single()
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ product: data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, category:categories(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  indexProduct(product as unknown as Product).catch(console.error)
  await invalidateCache('products:*')
  await invalidateCache(`product:${(product as Record<string, unknown>).slug}`)
  return NextResponse.json({ product })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const { data: product } = await supabaseAdmin.from('products').select('slug').eq('id', id).single()
  await supabaseAdmin.from('products').delete().eq('id', id)
  await deleteProductFromIndex(id).catch(console.error)
  if (product) await invalidateCache(`product:${(product as Record<string, unknown>).slug}`)
  await invalidateCache('products:*')
  return NextResponse.json({ success: true })
}
