import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const checkoutRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'rl:checkout',
})

export const searchRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rl:search',
})

export const aiChatRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  prefix: 'rl:ai',
})

export const CacheKeys = {
  products: (page: number, filters: string) => `products:${page}:${filters}`,
  product: (slug: string) => `product:${slug}`,
  categories: () => 'categories:all',
  featuredProducts: () => 'products:featured',
  cartCount: (userId: string) => `cart:count:${userId}`,
}

export async function getCached<T>(key: string): Promise<T | null> {
  return redis.get<T>(key)
}

export async function setCached<T>(key: string, value: T, ttlSeconds = 300) {
  return redis.set(key, value, { ex: ttlSeconds })
}

export async function invalidateCache(pattern: string) {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) await redis.del(...keys)
  } catch {}
}

export async function getGuestCart(sessionId: string) {
  return redis.get<{ product_id: string; variant_id: string | null; quantity: number }[]>(
    `guest_cart:${sessionId}`
  ) ?? []
}

export async function setGuestCart(
  sessionId: string,
  items: { product_id: string; variant_id: string | null; quantity: number }[]
) {
  await redis.set(`guest_cart:${sessionId}`, items, { ex: 7 * 24 * 60 * 60 })
}

export async function queueAbandonedCartEmail(userId: string, email: string, name: string) {
  await redis.set(`abandoned:${userId}`, { email, name, queued_at: Date.now() }, { ex: 7200 })
}

export async function clearAbandonedCart(userId: string) {
  await redis.del(`abandoned:${userId}`)
}
