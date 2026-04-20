import { supabaseAdmin } from '@/lib/supabase'
import { ProductCard } from './ProductCard'
import { Pagination } from './Pagination'
import type { SearchFilters, Product } from '@/types'

const PER_PAGE = 24

interface Props {
  filters: SearchFilters
  page: number
  query?: string
  isNew?: boolean
}

export async function ProductGrid({ filters, page, query = '', isNew = false }: Props) {
  let productIds: string[] | null = null

  if (query.length > 2) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/search?q=${encodeURIComponent(query)}${filters.category ? `&category=${filters.category}` : ''}`,
        { cache: 'no-store' }
      )
      const data = await res.json() as { products: Product[] }
      productIds = (data.products ?? []).map(p => p.id)
    } catch { productIds = [] }

    if (!productIds || productIds.length === 0) {
      return (
        <div className="text-center py-20">
          <p className="text-[#999] text-lg mb-2">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-sm text-[#bbb]">Try different keywords or browse our categories</p>
        </div>
      )
    }
  }

  let q = supabaseAdmin
    .from('products')
    .select('*, category:categories(*), variants:product_variants(*)', { count: 'exact' })
    .eq('is_active', true)

  if (productIds) q = q.in('id', productIds)

  if (filters.category) {
    const { data: cat } = await supabaseAdmin
      .from('categories').select('id').eq('slug', filters.category).single()
    if (cat) q = q.eq('category_id', (cat as Record<string, unknown>).id as string)
  }
  if (filters.min_price) q = q.gte('price', filters.min_price)
  if (filters.max_price) q = q.lte('price', filters.max_price)
  if (isNew) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    q = q.gte('created_at', thirtyDaysAgo)
  }

  switch (filters.sort) {
    case 'price_asc': q = q.order('price', { ascending: true }); break
    case 'price_desc': q = q.order('price', { ascending: false }); break
    case 'popular': q = q.order('rating_count', { ascending: false }); break
    case 'rating': q = q.order('rating_avg', { ascending: false }); break
    default: q = q.order('created_at', { ascending: false })
  }

  q = q.range((page - 1) * PER_PAGE, page * PER_PAGE - 1)

  const { data, count } = await q
  const products = (data as unknown as Product[]) ?? []
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-[#999] text-lg mb-2">No products found</p>
        <p className="text-sm text-[#bbb]">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-[#999] mb-4">{count} products</p>
      <div className="product-grid">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} priority={i < 4} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-12">
          <Pagination currentPage={page} totalPages={totalPages} />
        </div>
      )}
    </div>
  )
}
