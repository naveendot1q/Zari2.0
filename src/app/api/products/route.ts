import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { indexProduct } from '@/lib/pinecone'
import { generateProductDescription } from '@/lib/claude'
import { invalidateCache } from '@/lib/upstash'
import type { Product } from '@/types'

async function requireAdmin(): Promise<string | null> {
  const { userId } = auth()
  if (!userId) return null
  const { data: pd } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  const d = pd as { role: string } | null
  return d?.role === 'admin' ? userId : null
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const page = Number(url.searchParams.get('page') ?? 1)
  const perPage = 20
  const search = url.searchParams.get('q') ?? ''

  let q = supabaseAdmin
    .from('products')
    .select('*, category:categories(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (search) q = q.ilike('name', `%${search}%`)

  const { data, count } = await q
  return NextResponse.json({ data, total: count, page, per_page: perPage })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Record<string, unknown>
  const { generate_ai_description, ...productData } = body

  if (generate_ai_description) {
    const { data: category } = await supabaseAdmin
      .from('categories').select('name').eq('id', productData.category_id as string).single()
    const aiContent = await generateProductDescription({
      name: productData.name as string,
      category: (category as { name: string } | null)?.name ?? '',
      material: productData.material as string | undefined,
      tags: productData.tags as string[] | undefined,
    })
    if (!productData.description && aiContent.description) productData.description = aiContent.description
    if (!productData.short_description && aiContent.short_description) productData.short_description = aiContent.short_description
    productData.ai_description = aiContent.instagram_caption
  }

  if (!productData.slug) {
    productData.slug = (productData.name as string)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
      '-' + Date.now().toString(36)
  }

  const { data: product, error } = await supabaseAdmin
    .from('products').insert(productData).select('*, category:categories(*)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  indexProduct(product as unknown as Product).then(async () => {
    await supabaseAdmin.from('products').update({ vector_id: product.id }).eq('id', product.id)
  }).catch(console.error)

  await invalidateCache('products:*')
  return NextResponse.json({ product })
}
