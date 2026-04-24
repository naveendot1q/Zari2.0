import type { Product } from '@/types'

function getClient() {
  if (!process.env.PINECONE_API_KEY) return null
  const { Pinecone } = require('@pinecone-database/pinecone') as typeof import('@pinecone-database/pinecone')
  return new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
}

export async function indexProduct(product: Product): Promise<void> {
  try {
    const pinecone = getClient()
    if (!pinecone || !process.env.VOYAGE_API_KEY) return

    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.VOYAGE_API_KEY}` },
      body: JSON.stringify({ input: [product.name, product.description, product.tags.join(' ')].join('. '), model: 'voyage-2' }),
    })
    const data = await response.json() as { data: { embedding: number[] }[] }
    const embedding = data.data[0].embedding

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!)
    await index.upsert([{
      id: product.id,
      values: embedding,
      metadata: {
        product_id: product.id,
        name: product.name,
        category: (product.category as { name?: string } | undefined)?.name ?? '',
        tags: product.tags,
        price: product.price,
        description: product.short_description ?? product.description.slice(0, 200),
      },
    }])
  } catch (err) {
    console.error('Pinecone indexProduct error:', err)
  }
}

export async function semanticSearch(
  query: string,
  topK = 20,
  filter?: { category?: string; max_price?: number }
): Promise<string[]> {
  try {
    const pinecone = getClient()
    if (!pinecone || !process.env.VOYAGE_API_KEY) return []

    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.VOYAGE_API_KEY}` },
      body: JSON.stringify({ input: query, model: 'voyage-2' }),
    })
    const data = await response.json() as { data: { embedding: number[] }[] }
    const embedding = data.data[0].embedding

    const pineconeFilter: Record<string, unknown> = {}
    if (filter?.category) pineconeFilter.category = { $eq: filter.category }
    if (filter?.max_price) pineconeFilter.price = { $lte: filter.max_price }

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!)
    const results = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
      filter: Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined,
    })
    return (results.matches ?? []).map(m => m.metadata?.product_id as string).filter(Boolean)
  } catch {
    return []
  }
}

export async function findSimilarProducts(productId: string, topK = 6): Promise<string[]> {
  try {
    const pinecone = getClient()
    if (!pinecone) return []
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!)
    const result = await index.fetch([productId])
    const vector = result.records?.[productId]
    if (!vector) return []
    const similar = await index.query({ vector: vector.values, topK: topK + 1, includeMetadata: true })
    return (similar.matches ?? []).filter(m => m.id !== productId).slice(0, topK).map(m => m.metadata?.product_id as string).filter(Boolean)
  } catch {
    return []
  }
}

export async function deleteProductFromIndex(productId: string): Promise<void> {
  try {
    const pinecone = getClient()
    if (!pinecone) return
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!)
    await index.deleteOne(productId)
  } catch {}
}
