'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Trash2, Eye, Sparkles } from 'lucide-react'
import { formatPaise } from '@/lib/stripe'

interface Props {
  products: any[]
  page: number
  totalPages: number
}

export function AdminProductsTable({ products, page, totalPages }: Props) {
  const [list, setList] = useState(products)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setList(l => l.filter(p => p.id !== id))
      toast.success('Product deleted')
    } catch {
      toast.error('Failed to delete product')
    } finally {
      setDeleting(null)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      setList(l => l.map(p => p.id === id ? { ...p, is_active: !current } : p))
      toast.success(!current ? 'Product activated' : 'Product hidden')
    }
  }

  return (
    <div className="bg-white border border-[#ede9e3] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#faf9f7]">
            <tr>
              {['Product', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-medium text-[#999] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ede9e3]">
            {list.map(product => (
              <tr key={product.id} className="hover:bg-[#faf9f7] transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-14 bg-[#f5f0e8] rounded overflow-hidden flex-shrink-0">
                      {product.images?.[0] && (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                      <p className="text-xs text-[#999]">SKU: {product.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-[#666]">{product.category?.name}</td>
                <td className="px-5 py-4">
                  <div>
                    <p className="font-medium">{formatPaise(product.price)}</p>
                    {product.compare_price && (
                      <p className="text-xs text-[#bbb] line-through">{formatPaise(product.compare_price)}</p>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-sm font-medium ${product.total_stock === 0 ? 'text-red-500' : product.total_stock < 5 ? 'text-orange-500' : 'text-green-600'}`}>
                    {product.total_stock}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => toggleActive(product.id, product.is_active)}
                    className={`badge cursor-pointer text-xs ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {product.is_active ? 'Active' : 'Hidden'}
                  </button>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Link href={`/shop/product/${product.slug}`} target="_blank"
                      className="p-1.5 text-[#888] hover:text-[#1a1a1a] transition-colors" title="View">
                      <Eye size={15} />
                    </Link>
                    <Link href={`/admin/products/${product.id}/edit`}
                      className="p-1.5 text-[#888] hover:text-[#1a1a1a] transition-colors" title="Edit">
                      <Pencil size={15} />
                    </Link>
                    <button
                      onClick={() => deleteProduct(product.id, product.name)}
                      disabled={deleting === product.id}
                      className="p-1.5 text-[#888] hover:text-red-500 transition-colors disabled:opacity-30" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-[#ede9e3] flex justify-between items-center">
          <p className="text-xs text-[#999]">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/admin/products?page=${page - 1}`} className="text-xs px-3 py-1.5 border border-[#ede9e3] hover:bg-[#f5f0e8] transition-colors">← Prev</Link>
            )}
            {page < totalPages && (
              <Link href={`/admin/products?page=${page + 1}`} className="text-xs px-3 py-1.5 border border-[#ede9e3] hover:bg-[#f5f0e8] transition-colors">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
