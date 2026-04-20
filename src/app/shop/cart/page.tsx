'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Trash2, ShoppingBag } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useCart } from '@/hooks/useCart'
import { formatPaise, FREE_SHIPPING_THRESHOLD, SHIPPING_CHARGE } from '@/lib/stripe'

export default function CartPage() {
  const { items, updateQuantity, removeItem, summary, loading } = useCart()

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="section py-16 min-h-screen">
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 skeleton rounded" />)}
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <div className="section py-24 min-h-screen text-center">
          <ShoppingBag className="mx-auto text-[#ddd] mb-6" size={64} />
          <h1 className="text-3xl font-light mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Your cart is empty
          </h1>
          <p className="text-[#999] mb-8">Discover pieces you&apos;ll love</p>
          <Link href="/shop/products" className="btn-primary">Continue Shopping</Link>
        </div>
        <Footer />
      </>
    )
  }

  const remaining = FREE_SHIPPING_THRESHOLD - summary.subtotal
  const freeShippingProgress = Math.min(100, (summary.subtotal / FREE_SHIPPING_THRESHOLD) * 100)

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="section py-8 md:py-12">
          <h1 className="text-3xl font-light mb-8" style={{ fontFamily: 'var(--font-display)' }}>
            Your Cart ({items.length})
          </h1>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {remaining > 0 ? (
                <div className="bg-[#faf9f7] border border-[#ede9e3] rounded p-4">
                  <p className="text-xs text-[#666] mb-2">
                    Add <strong>{formatPaise(remaining)}</strong> more for free shipping
                  </p>
                  <div className="h-1 bg-[#ede9e3] rounded-full overflow-hidden">
                    <div className="h-full bg-[#1a1a1a] rounded-full transition-all duration-500" style={{ width: `${freeShippingProgress}%` }} />
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-xs text-green-700">🎉 You&apos;ve unlocked free shipping!</p>
                </div>
              )}

              {items.map(item => (
                <div key={item.id} className="flex gap-4 py-4 border-b border-[#ede9e3] last:border-0">
                  <div className="w-24 h-32 flex-shrink-0 bg-[#f5f0e8] rounded overflow-hidden">
                    {item.product?.images[0] ? (
                      <Image src={item.product.images[0]} alt={item.product?.name ?? ''} width={96} height={128} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#ccc] text-xs">No img</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="text-xs text-[#999] mb-0.5">{item.product?.category?.name}</p>
                        <Link href={`/shop/product/${item.product?.slug}`} className="font-medium text-sm hover:opacity-70 transition-opacity leading-snug">
                          {item.product?.name}
                        </Link>
                        {item.variant && (
                          <p className="text-xs text-[#888] mt-0.5">{item.variant.size} / {item.variant.color}</p>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-[#ccc] hover:text-[#e8534a] transition-colors flex-shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-[#ede9e3]">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-[#666] hover:bg-[#f5f0e8] transition-colors text-sm">−</button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-[#666] hover:bg-[#f5f0e8] transition-colors text-sm">+</button>
                      </div>
                      <span className="font-medium text-sm">{formatPaise((item.product?.price ?? 0) * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="bg-white border border-[#ede9e3] rounded-lg p-6 sticky top-24">
                <h2 className="text-lg font-medium mb-4">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-[#666]">Subtotal</span><span>{formatPaise(summary.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-[#666]">Shipping</span><span>{summary.shipping === 0 ? 'Free' : formatPaise(summary.shipping)}</span></div>
                  <div className="flex justify-between"><span className="text-[#666]">GST (5%)</span><span>{formatPaise(summary.tax)}</span></div>
                  <div className="flex justify-between font-medium text-base pt-3 border-t border-[#ede9e3]">
                    <span>Total</span><span>{formatPaise(summary.total)}</span>
                  </div>
                </div>
                <Link href="/shop/checkout" className="btn-primary w-full mt-6 py-4 text-center block">
                  Proceed to Checkout
                </Link>
                <Link href="/shop/products" className="block text-center text-xs text-[#999] mt-3 hover:text-[#1a1a1a] transition-colors">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
