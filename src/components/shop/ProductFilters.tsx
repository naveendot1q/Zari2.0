'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { Category, SearchFilters } from '@/types'

interface Props {
  categories: Category[]
  currentFilters: SearchFilters
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']
const PRICE_RANGES = [
  { label: 'Under ₹500', min: 0, max: 500 },
  { label: '₹500 – ₹1,000', min: 500, max: 1000 },
  { label: '₹1,000 – ₹2,000', min: 1000, max: 2000 },
  { label: '₹2,000 – ₹5,000', min: 2000, max: 5000 },
  { label: 'Above ₹5,000', min: 5000, max: undefined },
]
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Top Rated' },
]

export function ProductFilters({ categories, currentFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback((key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams])

  const clearAll = () => router.push(pathname)

  const hasFilters = currentFilters.category || currentFilters.min_price || currentFilters.max_price ||
    currentFilters.sizes?.length

  return (
    <div className="space-y-6">
      {hasFilters && (
        <button onClick={clearAll} className="text-xs text-[#888] hover:text-[#1a1a1a] underline transition-colors">
          Clear all filters
        </button>
      )}

      {/* Sort */}
      <div>
        <p className="label mb-2">Sort By</p>
        <select
          value={currentFilters.sort || 'newest'}
          onChange={e => updateParam('sort', e.target.value)}
          className="input text-sm py-2"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Category */}
      <div>
        <p className="label mb-2">Category</p>
        <div className="space-y-1">
          <button
            onClick={() => updateParam('category', undefined)}
            className={`block w-full text-left text-sm py-1 transition-colors ${
              !currentFilters.category ? 'text-[#1a1a1a] font-medium' : 'text-[#888] hover:text-[#1a1a1a]'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => updateParam('category', cat.slug)}
              className={`block w-full text-left text-sm py-1 transition-colors ${
                currentFilters.category === cat.slug ? 'text-[#1a1a1a] font-medium' : 'text-[#888] hover:text-[#1a1a1a]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <p className="label mb-2">Price</p>
        <div className="space-y-1">
          {PRICE_RANGES.map(r => {
            const minPaise = r.min * 100
            const maxPaise = r.max ? r.max * 100 : undefined
            const active = currentFilters.min_price === minPaise && currentFilters.max_price === maxPaise
            return (
              <button
                key={r.label}
                onClick={() => {
                  updateParam('min_price', r.min > 0 ? String(r.min) : undefined)
                  updateParam('max_price', r.max ? String(r.max) : undefined)
                }}
                className={`block w-full text-left text-sm py-1 transition-colors ${
                  active ? 'text-[#1a1a1a] font-medium' : 'text-[#888] hover:text-[#1a1a1a]'
                }`}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sizes */}
      <div>
        <p className="label mb-2">Size</p>
        <div className="flex flex-wrap gap-2">
          {SIZES.map(size => {
            const active = currentFilters.sizes?.includes(size)
            return (
              <button
                key={size}
                onClick={() => updateParam('sizes', active ? undefined : size)}
                className={`text-xs px-3 py-1.5 border transition-all ${
                  active
                    ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                    : 'border-[#ddd] text-[#666] hover:border-[#1a1a1a]'
                }`}
              >
                {size}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
