import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { supabaseAdmin } from '@/lib/supabase'
import { ProductCard } from '@/components/shop/ProductCard'
import type { Product } from '@/types'

export default async function WishlistPage() {
  const { userId } = await auth()
  if (!userId) redirect('/auth/sign-in')

  const { data: wishlistItems } = await supabaseAdmin
    .from('wishlists')
    .select('product:products(*, category:categories(*), variants:product_variants(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const products = ((wishlistItems ?? []) as Record<string, unknown>[])
    .map(item => item.product as Product)
    .filter(Boolean)

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="section py-8 md:py-12">
          <h1 className="text-3xl font-light mb-8" style={{ fontFamily: 'var(--font-display)' }}>
            Wishlist ({products.length})
          </h1>
          {products.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="mx-auto text-[#ddd] mb-6" size={64} />
              <p className="text-[#999] text-lg mb-4">Your wishlist is empty</p>
              <p className="text-[#bbb] text-sm mb-8">Save items you love and shop them later</p>
              <Link href="/shop/products" className="btn-primary">Browse Collection</Link>
            </div>
          ) : (
            <div className="product-grid">
              {products.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
