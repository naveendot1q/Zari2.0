import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { semanticSearch } from '@/lib/pinecone'
import { searchRateLimit } from '@/lib/upstash'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const { success } = await searchRateLimit.limit(ip)
  if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

  const url = new URL(req.url)
  const q = url.searchParams.get('q') ?? ''
  const category = url.searchParams.get('category') ?? undefined
  const minPrice = url.searchParams.get('min_price') ? Number(url.searchParams.get('min_price')) * 100 : undefined
  const maxPrice = url.searchParams.get('max_price') ? Number(url.searchParams.get('max_price')) * 100 : undefined
  const page = Number(url.searchParams.get('page') ?? 1)
  const perPage = 24

  if (q.length < 2) return NextResponse.json({ products: [], total: 0 })

  let productIds: string[] = []
  try {
    productIds = await semanticSearch(q, 48, { category, max_price: maxPrice })
  } catch {
    // Pinecone unavailable — fall through to FTS
  }

  if (productIds.length === 0) {
    let ftsQ = supabaseAdmin
      .from('products')
      .select('*, category:categories(*)', { count: 'exact' })
      .eq('is_active', true)
      .textSearch('name', q, { type: 'websearch' })
    if (minPrice) ftsQ = ftsQ.gte('price', minPrice)
    if (maxPrice) ftsQ = ftsQ.lte('price', maxPrice)
    ftsQ = ftsQ.range((page - 1) * perPage, page * perPage - 1)
    const { data, count } = await ftsQ
    return NextResponse.json({ products: data ?? [], total: count ?? 0, query: q, source: 'fts' })
  }

  const { data, count } = await supabaseAdmin
    .from('products')
    .select('*, category:categories(*)', { count: 'exact' })
    .eq('is_active', true)
    .in('id', productIds)
    .range((page - 1) * perPage, page * perPage - 1)

  return NextResponse.json({ products: data ?? [], total: count ?? 0, query: q, source: 'semantic' })
}
