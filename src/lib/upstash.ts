import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Only initialize if env vars are present
const getRedis = () => {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? 'https://placeholder.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? 'placeholder',
})

const getRatelimit = (requests: number, window: string, prefix: string) =>
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    prefix,
  })

export const checkoutRateLimit = getRatelimit(10, '1 m', 'rl:checkout')
export const searchRateLimit = getRatelimit(60, '1 m', 'rl:search')
export const aiChatRateLimit = getRatelimit(20, '1 h', 'rl:ai')

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) return null
    return await redis.get<T>(key)
  } catch { return null }
}

export async function setCached<T>(key: string, value: T, ttlSeconds = 300) {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) return null
    return await redis.set(key, value, { ex: ttlSeconds })
  } catch { return null }
}

export async function invalidateCache(pattern: string) {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) return
    const keys = await redis.keys(pattern)
    if (keys.length > 0) await redis.del(...keys)
  } catch {}
}

export async function getGuestCart(sessionId: string) {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) return []
    return await redis.get<{ product_id: string; variant_id: string | null; quantity: number }[]>(
      `guest_cart:${sessionId}`
    ) ?? []
  } catch { return [] }
}

export async function setGuestCart(
  sessionId: string,
  items: { product_id: string; variant_id: string | null; quantity: number }[]
) {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) return
    await redis.set(`guest_cart:${sessionId}`, items, { ex: 7 * 24 * 60 * 60 })
  } catch {}
}

export async function queueAbandonedCartEmail(userId: string, email: string, name: string) {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) return
    await redis.set(`abandoned:${userId}`, { email, name, queued_at: Date.now() }, { ex: 7200 })
  } catch {}
}

export async function clearAbandonedCart(userId: string) {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) return
    await redis.del(`abandoned:${userId}`)
  } catch {}
}
