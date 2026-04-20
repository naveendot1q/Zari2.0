'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart } from 'lucide-react'
import { useState } from 'react'
import type { Product } from '@/types'
import { formatPaise } from '@/lib/stripe'
import { useWishlist } from '@/hooks/useWishlist'

interface Props {
  product: Product
  priority?: boolean
}

export function ProductCard({ product, priority = false }: Props) {
  const { isWishlisted, toggle } = useWishlist(product.id)
  const [hoverImage, setHoverImage] = useState(false)

  const discount = product.compare_price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0

  const displayImage = hoverImage && product.images[1]
    ? product.images[1]
    : product.images[0]

  return (
    <div className="product-card group relative">
      <Link href={`/shop/product/${product.slug}`}>
        <div
          className="relative aspect-[3/4] overflow-hidden bg-[#f5f0e8]"
          onMouseEnter={() => setHoverImage(true)}
          onMouseLeave={() => setHoverImage(false)}
        >
          {product.images[0] ? (
            <Image
              src={displayImage ?? product.images[0]}
              alt={product.name}
              fill
              className="product-card-image object-cover"
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#ccc] text-xs">No image</div>
          )}

          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {discount >= 10 && (
              <span className="badge bg-[#1a1a1a] text-white text-[10px]">{discount}% off</span>
            )}
            {product.total_stock === 0 && (
              <span className="badge bg-white text-[#666] text-[10px]">Sold out</span>
            )}
          </div>
        </div>
      </Link>

      <button
        onClick={() => { void toggle() }}
        className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95 duration-200"
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart size={16} className={isWishlisted ? 'fill-[#e8534a] stroke-[#e8534a]' : 'stroke-[#666]'} />
      </button>

      <div className="pt-3 pb-1">
        <p className="text-[11px] text-[#999] uppercase tracking-wider mb-1">{product.category?.name}</p>
        <Link href={`/shop/product/${product.slug}`}>
          <h3 className="text-sm font-medium text-[#1a1a1a] hover:opacity-70 transition-opacity leading-snug line-clamp-2">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="price-tag text-sm">{formatPaise(product.price)}</span>
          {product.compare_price && (
            <span className="price-compare">{formatPaise(product.compare_price)}</span>
          )}
        </div>
        {product.rating_count > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[#e8c97a] text-xs">★</span>
            <span className="text-xs text-[#888]">{product.rating_avg.toFixed(1)} ({product.rating_count})</span>
          </div>
        )}
      </div>
    </div>
  )
}
