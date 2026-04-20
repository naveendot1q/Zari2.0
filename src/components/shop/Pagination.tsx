'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface Props {
  currentPage: number
  totalPages: number
}

export function Pagination({ currentPage, totalPages }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function goTo(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.push(`${pathname}?${params.toString()}`)
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2
  )

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => goTo(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-2 text-sm border border-[#ede9e3] disabled:opacity-30 hover:bg-[#f5f0e8] transition-colors"
      >
        ← Prev
      </button>

      {pages.map((page, i) => (
        <span key={page}>
          {i > 0 && pages[i - 1] !== page - 1 && (
            <span className="px-2 text-[#ccc]">…</span>
          )}
          <button
            onClick={() => goTo(page)}
            className={`w-9 h-9 text-sm border transition-colors ${
              page === currentPage
                ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                : 'border-[#ede9e3] hover:bg-[#f5f0e8]'
            }`}
          >
            {page}
          </button>
        </span>
      ))}

      <button
        onClick={() => goTo(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-2 text-sm border border-[#ede9e3] disabled:opacity-30 hover:bg-[#f5f0e8] transition-colors"
      >
        Next →
      </button>
    </div>
  )
}
