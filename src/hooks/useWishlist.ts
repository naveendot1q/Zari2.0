'use client'

import { create } from 'zustand'
import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import toast from 'react-hot-toast'

interface WishlistState {
  productIds: Set<string>
  setIds: (ids: string[]) => void
}

const useWishlistStore = create<WishlistState>((set) => ({
  productIds: new Set(),
  setIds: (ids) => set({ productIds: new Set(ids) }),
}))

interface WishlistItem { product_id: string }

export function useWishlist(productId?: string) {
  const { isSignedIn } = useUser()
  const { productIds, setIds } = useWishlistStore()

  useEffect(() => {
    if (isSignedIn) fetchWishlist()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn])

  async function fetchWishlist() {
    const res = await fetch('/api/wishlist')
    const data = await res.json() as { items: WishlistItem[] }
    setIds((data.items ?? []).map(i => i.product_id))
  }

  async function toggle() {
    if (!isSignedIn) { toast.error('Please sign in to save items'); return }
    if (!productId) return

    const wasWishlisted = productIds.has(productId)
    const newIds = new Set(productIds)
    if (wasWishlisted) newIds.delete(productId)
    else newIds.add(productId)
    setIds([...newIds])

    await fetch('/api/wishlist', {
      method: wasWishlisted ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    })
    toast.success(wasWishlisted ? 'Removed from wishlist' : 'Saved to wishlist ♡')
  }

  return {
    isWishlisted: productId ? productIds.has(productId) : false,
    toggle,
    productIds,
  }
}
