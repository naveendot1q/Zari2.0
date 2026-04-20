'use client'

import { create } from 'zustand'
import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import type { CartItem, CartSummary } from '@/types'
import { calculateOrderTotals } from '@/lib/stripe'

interface CartState {
  items: CartItem[]
  loading: boolean
  initialized: boolean
  setItems: (items: CartItem[]) => void
  setLoading: (v: boolean) => void
  setInitialized: (v: boolean) => void
}

const useCartStore = create<CartState>((set) => ({
  items: [],
  loading: false,
  initialized: false,
  setItems: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
}))

export function useCart() {
  const { isSignedIn } = useUser()
  const { items, loading, initialized, setItems, setLoading, setInitialized } = useCartStore()

  useEffect(() => {
    if (isSignedIn && !initialized) fetchCart()
    if (!isSignedIn) { setItems([]); setInitialized(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn])

  async function fetchCart() {
    setLoading(true)
    try {
      const res = await fetch('/api/cart')
      const data = await res.json() as { items: CartItem[] }
      setItems(data.items ?? [])
      setInitialized(true)
    } finally {
      setLoading(false)
    }
  }

  async function addItem(payload: { product_id: string; variant_id: string | null; quantity: number }) {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to add item')
    await fetchCart()
  }

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) return removeItem(itemId)
    await fetch(`/api/cart/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    })
    await fetchCart()
  }

  async function removeItem(itemId: string) {
    setItems(items.filter(i => i.id !== itemId))
    await fetch(`/api/cart/${itemId}`, { method: 'DELETE' })
  }

  async function clearCart() {
    setItems([])
    await fetch('/api/cart', { method: 'DELETE' })
  }

  const subtotal = items.reduce((sum, item) => {
    const price = (item.product?.price ?? 0) + (item.variant?.price_modifier ?? 0)
    return sum + price * item.quantity
  }, 0)

  const totals = calculateOrderTotals(subtotal)
  const summary: CartSummary = { items, ...totals, coupon: null }

  return { items, loading, summary, addItem, updateQuantity, removeItem, clearCart, refetch: fetchCart }
}

export function useCartCount() {
  const { items } = useCartStore()
  return items.reduce((sum, item) => sum + item.quantity, 0)
}
