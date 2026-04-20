'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ShoppingBag, Ruler } from 'lucide-react'
import type { Product, ProductVariant } from '@/types'
import { useCart } from '@/hooks/useCart'
import { analytics } from '@/lib/posthog'

interface Props {
  product: Product
  sizes: string[]
  colors: string[]
}

export function AddToCartForm({ product, sizes, colors }: Props) {
  const { isSignedIn } = useUser()
  const router = useRouter()
  const { addItem } = useCart()

  const [selectedSize, setSelectedSize] = useState<string>(sizes[0] ?? '')
  const [selectedColor, setSelectedColor] = useState<string>(colors[0] ?? '')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)

  const selectedVariant = product.variants?.find(
    v => v.size === selectedSize && v.color === selectedColor
  )

  const isOutOfStock =
    product.total_stock === 0 || (selectedVariant ? selectedVariant.stock === 0 : false)

  const variantStock = selectedVariant?.stock ?? product.total_stock

  async function handleAddToCart() {
    if (!isSignedIn) {
      router.push('/auth/sign-in?redirect_url=/shop/product/' + product.slug)
      return
    }
    if (!selectedSize && sizes.length > 0) { toast.error('Please select a size'); return }
    setLoading(true)
    try {
      await addItem({ product_id: product.id, variant_id: selectedVariant?.id ?? null, quantity })
      analytics.addToCart({ id: product.id, name: product.name, price: product.price, quantity })
      toast.success('Added to cart!')
    } catch {
      toast.error('Failed to add to cart')
    } finally {
      setLoading(false)
    }
  }

  async function handleBuyNow() {
    await handleAddToCart()
    router.push('/shop/cart')
  }

  return (
    <div className="space-y-5">
      {sizes.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="label">Size</label>
            <button type="button" className="flex items-center gap-1 text-xs text-[#888] hover:text-[#1a1a1a] transition-colors">
              <Ruler size={12} /> Size guide
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map(size => {
              const v = product.variants?.find(vv => vv.size === size && vv.color === selectedColor)
              const oos = v ? v.stock === 0 : false
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  disabled={oos}
                  className={`px-4 py-2 text-sm border transition-all duration-150 ${
                    selectedSize === size
                      ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                      : oos
                        ? 'border-[#ddd] text-[#ccc] cursor-not-allowed line-through'
                        : 'border-[#ddd] text-[#666] hover:border-[#1a1a1a]'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div>
          <label className="label">
            Color: <span className="text-[#1a1a1a] normal-case font-normal">{selectedColor}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {colors.map(color => {
              const v = product.variants?.find(vv => vv.color === color && vv.size === selectedSize) as ProductVariant | undefined
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm border transition-all duration-150 ${
                    selectedColor === color ? 'border-[#1a1a1a]' : 'border-[#ddd] hover:border-[#999]'
                  }`}
                >
                  {v?.color_hex && (
                    <span className="w-3 h-3 rounded-full border border-[#eee]" style={{ background: v.color_hex }} />
                  )}
                  {color}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <label className="label">Quantity</label>
        <div className="flex items-center border border-[#ede9e3] w-fit">
          <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-[#666] hover:bg-[#f5f0e8] transition-colors">−</button>
          <span className="w-10 text-center text-sm font-medium">{quantity}</span>
          <button type="button" onClick={() => setQuantity(q => Math.min(variantStock, q + 1))}
            disabled={quantity >= variantStock}
            className="w-10 h-10 flex items-center justify-center text-[#666] hover:bg-[#f5f0e8] transition-colors disabled:opacity-30">+</button>
        </div>
        {variantStock > 0 && variantStock <= 5 && (
          <p className="text-xs text-orange-500 mt-1">Only {variantStock} left!</p>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock || loading}
          className="btn-primary w-full py-4 text-sm tracking-widest uppercase"
        >
          {loading ? 'Adding...' : isOutOfStock ? 'Out of Stock' : (
            <span className="flex items-center justify-center gap-2"><ShoppingBag size={16} /> Add to Cart</span>
          )}
        </button>
        {!isOutOfStock && (
          <button type="button" onClick={handleBuyNow} disabled={loading}
            className="btn-outline w-full py-4 text-sm tracking-widest uppercase">
            Buy Now
          </button>
        )}
      </div>
    </div>
  )
}
