import { Pinecone } from '@pinecone-database/pinecone'
import type { Product } from '@/types'

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })

export function getIndex() {
  return pinecone.index(process.env.PINECONE_INDEX_NAME!)
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: text, model: 'voyage-2' }),
  })
  const data = await response.json() as { data: { embedding: number[] }[] }
  return data.data[0].embedding
}

export async function indexProduct(product: Product): Promise<void> {
  const text = [
    product.name,
    product.description,
    (product.category as { name?: string } | undefined)?.name ?? '',
    product.tags.join(' '),
    product.material ?? '',
  ].join('. ')

  const embedding = await generateEmbedding(text)
  const index = getIndex()

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
}

export async function semanticSearch(
  query: string,
  topK = 20,
  filter?: { category?: string; max_price?: number }
): Promise<string[]> {
  const embedding = await generateEmbedding(query)
  const index = getIndex()

  const pineconeFilter: Record<string, unknown> = {}
  if (filter?.category) pineconeFilter.category = { $eq: filter.category }
  if (filter?.max_price) pineconeFilter.price = { $lte: filter.max_price }

  const results = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
    filter: Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined,
  })

  return (results.matches ?? [])
    .map((m) => m.metadata?.product_id as string)
    .filter(Boolean)
}

export async function findSimilarProducts(productId: string, topK = 6): Promise<string[]> {
  const index = getIndex()
  const result = await index.fetch([productId])
  const vector = result.records?.[productId]
  if (!vector) return []

  const similar = await index.query({
    vector: vector.values,
    topK: topK + 1,
    includeMetadata: true,
  })

  return (similar.matches ?? [])
    .filter((m) => m.id !== productId)
    .slice(0, topK)
    .map((m) => m.metadata?.product_id as string)
    .filter(Boolean)
}

export async function deleteProductFromIndex(productId: string): Promise<void> {
  const index = getIndex()
  await index.deleteOne(productId)
}
