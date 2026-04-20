import { supabaseAdmin } from '@/lib/supabase'
import { ProductCard } from './ProductCard'
import type { Product } from '@/types'

interface Props { productId: string }

export async function SimilarProducts({ productId }: Props) {
  // Fallback to same-category products (Pinecone optional)
  const { data: product } = await supabaseAdmin
    .from('products').select('category_id').eq('id', productId).single()

  if (!product) return null

  const { data } = await supabaseAdmin
    .from('products')
    .select('*, category:categories(*), variants:product_variants(*)')
    .eq('category_id', (product as Record<string, unknown>).category_id as string)
    .eq('is_active', true)
    .neq('id', productId)
    .limit(4)

  const products = (data as unknown as Product[]) ?? []
  if (products.length === 0) return null

  return (
    <div>
      <h2 className="text-2xl font-light mb-6" style={{ fontFamily: 'var(--font-display)' }}>
        You May Also Like
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}
