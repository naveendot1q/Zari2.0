import { Suspense } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ProductGrid } from '@/components/shop/ProductGrid'
import { ProductFilters } from '@/components/shop/ProductFilters'
import { supabaseAdmin } from '@/lib/supabase'
import type { SearchFilters } from '@/types'

interface Props {
  searchParams: Promise<{
    category?: string
    min_price?: string
    max_price?: string
    sizes?: string
    colors?: string
    sort?: string
    page?: string
    q?: string
    new?: string
  }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams

  const filters: SearchFilters = {
    category: sp.category,
    min_price: sp.min_price ? Number(sp.min_price) * 100 : undefined,
    max_price: sp.max_price ? Number(sp.max_price) * 100 : undefined,
    sizes: sp.sizes?.split(','),
    colors: sp.colors?.split(','),
    sort: (sp.sort as SearchFilters['sort']) || 'newest',
  }
  const page = Number(sp.page) || 1
  const query = sp.q || ''
  const isNew = sp.new === 'true'

  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  const title = filters.category
    ? categories?.find(c => c.slug === filters.category)?.name || 'Products'
    : isNew ? 'New Arrivals' : query ? `Search: "${query}"` : 'All Products'

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="section py-8">
          <div className="flex items-baseline justify-between mb-6">
            <h1 className="text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
              {title}
            </h1>
          </div>
          <div className="flex gap-8">
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <ProductFilters categories={categories || []} currentFilters={filters} />
            </aside>
            <div className="flex-1 min-w-0">
              <Suspense fallback={<ProductGridSkeleton />}>
                <ProductGrid filters={filters} page={page} query={query} isNew={isNew} />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="product-grid">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[3/4] skeleton rounded" />
          <div className="mt-3 h-3 skeleton rounded w-3/4" />
          <div className="mt-2 h-4 skeleton rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}
