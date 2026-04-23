import type { AIStylingMessage } from '@/types'

export async function generateProductDescription(product: {
  name: string
  category: string
  material?: string
  tags?: string[]
}): Promise<{ description: string; short_description: string; instagram_caption: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { description: '', short_description: '', instagram_caption: '' }
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Generate product copy for an Indian women's clothing store called Zari.

Product:
- Name: ${product.name}
- Category: ${product.category}
${product.material ? `- Material: ${product.material}` : ''}
${product.tags?.length ? `- Tags: ${product.tags.join(', ')}` : ''}

Return a JSON object with:
1. "description": Full description (150-200 words), fabric feel, occasion suitability, styling tips.
2. "short_description": One sentence max 15 words for product cards.
3. "instagram_caption": Engaging caption with 3-5 hashtags under 150 chars.

Return only valid JSON, no markdown backticks.`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    return JSON.parse(text) as { description: string; short_description: string; instagram_caption: string }
  } catch {
    return { description: '', short_description: '', instagram_caption: '' }
  }
}
