'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ProductCard } from '@/components/shop/ProductCard'
import type { Product } from '@/types'

const SUGGESTIONS = [
  'Floral kurta', 'Silk saree', 'Party lehenga', 'Office wear',
  'Cotton dress', 'Festive outfit', 'Summer top', 'Palazzo set',
]

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    if (initialQuery) void doSearch(initialQuery)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function doSearch(q: string) {
    if (q.length < 2) { setResults([]); setSearched(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json() as { products: Product[]; total: number }
      setResults(data.products ?? [])
      setTotal(data.total ?? 0)
      setSearched(true)
      router.replace(`/shop/search?q=${encodeURIComponent(q)}`, { scroll: false })
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { void doSearch(q) }, 400)
  }

  function clear() {
    setQuery(''); setResults([]); setSearched(false)
    router.replace('/shop/search', { scroll: false })
    inputRef.current?.focus()
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="section py-8 max-w-4xl">
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbb]" size={20} />
            <input
              ref={inputRef}
              value={query}
              onChange={handleChange}
              onKeyDown={e => { if (e.key === 'Enter') void doSearch(query) }}
              placeholder="Search for kurtas, sarees, lehengas..."
              className="w-full pl-12 pr-12 py-4 text-base border border-[#ede9e3] rounded-xl outline-none focus:border-[#1a1a1a] transition-colors bg-white"
              autoComplete="off"
            />
            {query && !loading && (
              <button onClick={clear} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#666]">
                <X size={18} />
              </button>
            )}
            {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#bbb] animate-spin" size={18} />}
          </div>

          {!searched && !loading && (
            <div>
              <p className="text-xs text-[#999] uppercase tracking-wider mb-3">Popular searches</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setQuery(s); void doSearch(s) }}
                    className="text-sm px-4 py-2 border border-[#ede9e3] rounded-full hover:border-[#1a1a1a] transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {searched && !loading && (
            <div>
              <p className="text-sm text-[#888] mb-6">
                {total === 0 ? `No results for &ldquo;${query}&rdquo;` : `${total} results for &ldquo;${query}&rdquo;`}
              </p>
              {results.length > 0 ? (
                <div className="product-grid">
                  {results.map(product => <ProductCard key={product.id} product={product} />)}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-[#999] mb-4">Try different keywords or browse our categories</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.slice(0, 4).map(s => (
                      <button key={s} onClick={() => { setQuery(s); void doSearch(s) }}
                        className="text-sm px-4 py-2 border border-[#ede9e3] rounded-full hover:border-[#1a1a1a] transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
