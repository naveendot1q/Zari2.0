import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ProductImages } from '@/components/shop/ProductImages'
import { AddToCartForm } from '@/components/shop/AddToCartForm'
import { ProductReviews } from '@/components/shop/ProductReviews'
import { SimilarProducts } from '@/components/shop/SimilarProducts'
import { AiStylistButton } from '@/components/ai/AiStylistButton'
import { supabaseAdmin } from '@/lib/supabase'
import { formatPaise } from '@/lib/stripe'
import type { Product } from '@/types'

interface Props {
  params: Promise<{ slug: string }>
}

async function getProduct(slug: string): Promise<Product | null> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('*, category:categories(*), variants:product_variants(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  return data as Product | null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return {}
  return {
    title: product.name,
    description: product.short_description || product.description.slice(0, 155),
    openGraph: { images: product.images[0] ? [product.images[0]] : [] },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  const discount = product.compare_price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0

  const sizes = [...new Set(product.variants?.map(v => v.size) || [])]
  const colors = [...new Set(product.variants?.map(v => v.color) || [])]

  return (
    <>
      <Navbar />
      <main>
        <div className="section py-8 md:py-12">
          <nav className="text-xs text-[#999] mb-6 flex items-center gap-2">
            <a href="/" className="hover:text-[#1a1a1a]">Home</a>
            <span>/</span>
            <a href="/shop/products" className="hover:text-[#1a1a1a]">Shop</a>
            <span>/</span>
            <a href={`/shop/products?category=${product.category?.slug}`} className="hover:text-[#1a1a1a]">
              {product.category?.name}
            </a>
            <span>/</span>
            <span className="text-[#1a1a1a]">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
            <ProductImages images={product.images} name={product.name} />

            <div className="flex flex-col">
              <p className="text-xs text-[#999] uppercase tracking-wider mb-2">{product.category?.name}</p>
              <h1 className="text-3xl md:text-4xl font-light leading-tight mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                {product.name}
              </h1>

              {product.rating_count > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className={`text-sm ${s <= Math.round(product.rating_avg) ? 'text-[#e8c97a]' : 'text-[#ddd]'}`}>★</span>
                    ))}
                  </div>
                  <span className="text-xs text-[#888]">{product.rating_avg.toFixed(1)} ({product.rating_count} reviews)</span>
                </div>
              )}

              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-2xl font-medium">{formatPaise(product.price)}</span>
                {product.compare_price && (
                  <>
                    <span className="text-lg text-[#bbb] line-through">{formatPaise(product.compare_price)}</span>
                    <span className="text-sm text-green-600 font-medium">{discount}% off</span>
                  </>
                )}
              </div>
              <p className="text-xs text-[#888] mb-6">Inclusive of all taxes (GST included)</p>

              <AddToCartForm product={product} sizes={sizes} colors={colors} />

              <div className="mt-8 pt-8 border-t border-[#ede9e3]">
                <h2 className="text-sm font-medium mb-3 uppercase tracking-wider">Description</h2>
                <div className="text-sm text-[#555] leading-relaxed whitespace-pre-line">{product.description}</div>
              </div>

              {(product.material || product.care_instructions || product.origin) && (
                <div className="mt-6 pt-6 border-t border-[#ede9e3] space-y-3">
                  {product.material && (
                    <div className="flex gap-4 text-sm">
                      <span className="text-[#999] w-28 flex-shrink-0">Material</span>
                      <span>{product.material}</span>
                    </div>
                  )}
                  {product.care_instructions && (
                    <div className="flex gap-4 text-sm">
                      <span className="text-[#999] w-28 flex-shrink-0">Care</span>
                      <span>{product.care_instructions}</span>
                    </div>
                  )}
                  {product.origin && (
                    <div className="flex gap-4 text-sm">
                      <span className="text-[#999] w-28 flex-shrink-0">Origin</span>
                      <span>{product.origin}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-[#ede9e3]">
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { icon: '🚚', title: 'Free shipping', sub: 'Orders above ₹500' },
                    { icon: '↩️', title: '7-day returns', sub: 'Easy return policy' },
                    { icon: '🔒', title: 'Secure payment', sub: 'Stripe & UPI' },
                  ].map(item => (
                    <div key={item.title}>
                      <div className="text-xl mb-1">{item.icon}</div>
                      <p className="text-xs font-medium">{item.title}</p>
                      <p className="text-xs text-[#999]">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="section py-12 border-t border-[#ede9e3]">
          <ProductReviews productId={product.id} />
        </div>
        <div className="section py-12 border-t border-[#ede9e3]">
          <SimilarProducts productId={product.id} />
        </div>
      </main>
      <Footer />
      {process.env.ANTHROPIC_API_KEY && <AiStylistButton contextProduct={product} />}
    </>
  )
}
