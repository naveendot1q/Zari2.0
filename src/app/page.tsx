import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ProductCard } from '@/components/shop/ProductCard'
import { CategoryGrid } from '@/components/shop/CategoryGrid'
import { AiStylistButton } from '@/components/ai/AiStylistButton'
import type { Product, Category } from '@/types'

async function getFeaturedProducts(): Promise<Product[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('*, category:categories(*), variants:product_variants(*)')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(8)
  return (data as unknown as Product[]) ?? []
}

async function getCategories(): Promise<Category[]> {
  const { data } = await supabaseAdmin
    .from('categories').select('*').eq('is_active', true).order('sort_order')
  return (data as unknown as Category[]) ?? []
}

export default async function HomePage() {
  const [featured, categories] = await Promise.all([getFeaturedProducts(), getCategories()])

  return (
    <>
      <Navbar />
      <main>
        <section className="relative h-[90vh] min-h-[600px] flex items-end pb-16 overflow-hidden bg-[#1a1a1a]">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
            <div className="w-full h-full bg-gradient-to-br from-[#2a1f10] via-[#1a1510] to-[#0d1015]" />
          </div>
          <div className="relative z-20 section w-full">
            <div className="max-w-xl">
              <p className="text-[#e8c97a] text-xs tracking-[4px] uppercase mb-4 font-light">New Collection</p>
              <h1 className="text-white text-5xl md:text-7xl font-light leading-tight mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                Dress with<br />
                <span className="italic text-[#e8c97a]">intention</span>
              </h1>
              <p className="text-white/70 text-base mb-8 leading-relaxed">
                Handpicked kurtas, sarees &amp; lehengas for the modern Indian woman.
              </p>
              <div className="flex gap-4 flex-wrap">
                <Link href="/shop/products" className="btn-primary">Shop Collection</Link>
                <Link href="/shop/products?category=lehengas" className="inline-flex items-center gap-2 text-white/80 text-sm hover:text-white transition-colors">
                  Explore Lehengas →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-[#1a1a1a] text-white/60 border-t border-white/5">
          <div className="section py-3">
            <div className="flex flex-wrap justify-center md:justify-between gap-4 text-xs tracking-widest uppercase">
              <span>Free shipping above ₹500</span>
              <span>Easy 7-day returns</span>
              <span>Secure payments</span>
              <span>100% authentic</span>
            </div>
          </div>
        </div>

        <section className="py-16 section">
          <h2 className="text-3xl font-light mb-8 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            Shop by Category
          </h2>
          <CategoryGrid categories={categories} />
        </section>

        <section className="py-16 bg-white">
          <div className="section">
            <div className="flex justify-between items-baseline mb-8">
              <h2 className="text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>Featured Pieces</h2>
              <Link href="/shop/products" className="text-sm text-[#666] hover:text-[#1a1a1a] transition-colors">View all →</Link>
            </div>
            <div className="product-grid">
              {featured.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        </section>

        <section className="py-16 section text-center">
          <p className="text-[#e8c97a] text-xs tracking-[4px] uppercase mb-3">Styled by You</p>
          <h2 className="text-3xl font-light mb-4" style={{ fontFamily: 'var(--font-display)' }}>Follow @zari on Instagram</h2>
          <p className="text-[#999] text-sm mb-8">Tag us in your looks to be featured</p>
          <a href="https://instagram.com/zari" target="_blank" rel="noopener noreferrer" className="btn-outline">
            @zari on Instagram
          </a>
        </section>
      </main>
      <Footer />
      <AiStylistButton />
    </>
  )
}
