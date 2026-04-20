'use client'

import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
    })
  }
}

export { posthog }

export const analytics = {
  pageView: (url: string) => posthog.capture('$pageview', { $current_url: url }),
  productViewed: (p: { id: string; name: string; price: number; category: string }) =>
    posthog.capture('product_viewed', p),
  addToCart: (p: { id: string; name: string; price: number; quantity: number }) =>
    posthog.capture('add_to_cart', p),
  removeFromCart: (productId: string) =>
    posthog.capture('remove_from_cart', { product_id: productId }),
  wishlistAdded: (productId: string) =>
    posthog.capture('wishlist_added', { product_id: productId }),
  checkoutStarted: (value: number, items: number) =>
    posthog.capture('checkout_started', { total_value: value, item_count: items }),
  orderCompleted: (orderId: string, value: number, paymentMethod: string) =>
    posthog.capture('order_completed', { order_id: orderId, value, payment_method: paymentMethod }),
  searchPerformed: (query: string, resultsCount: number) =>
    posthog.capture('search_performed', { query, results_count: resultsCount }),
  aiChatStarted: () => posthog.capture('ai_chat_started'),
  identify: (userId: string, properties: Record<string, unknown>) =>
    posthog.identify(userId, properties),
  reset: () => posthog.reset(),
}
