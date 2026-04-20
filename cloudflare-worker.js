// cloudflare-worker.js
// Deploy this as a Cloudflare Worker to cache product pages at the edge

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const CACHEABLE_PATHS = [
  /^\/shop\/products$/,
  /^\/shop\/product\//,
  /^\/$/,
]

const CACHE_TTL = {
  homepage: 60,         // 1 minute
  products_list: 120,   // 2 minutes
  product_page: 300,    // 5 minutes
}

async function handleRequest(request) {
  const url = new URL(request.url)
  const isCacheable = CACHEABLE_PATHS.some(p => p.test(url.pathname))

  if (!isCacheable || request.method !== 'GET') {
    return fetch(request)
  }

  // Check cache
  const cacheKey = new Request(url.toString(), request)
  const cache = caches.default
  let response = await cache.match(cacheKey)

  if (response) {
    return new Response(response.body, {
      ...response,
      headers: {
        ...Object.fromEntries(response.headers),
        'X-Cache': 'HIT',
      },
    })
  }

  // Fetch from origin
  response = await fetch(request)

  if (response.status === 200) {
    let ttl = CACHE_TTL.product_page
    if (url.pathname === '/') ttl = CACHE_TTL.homepage
    else if (url.pathname === '/shop/products') ttl = CACHE_TTL.products_list

    const cachedResponse = new Response(response.body, {
      ...response,
      headers: {
        ...Object.fromEntries(response.headers),
        'Cache-Control': `public, max-age=${ttl}, stale-while-revalidate=60`,
        'X-Cache': 'MISS',
      },
    })

    event.waitUntil(cache.put(cacheKey, cachedResponse.clone()))
    return cachedResponse
  }

  return response
}
