import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { aiChatRateLimit } from '@/lib/upstash'
import type { AIStylingMessage } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { userId } = auth()
  const identifier = userId ?? req.headers.get('x-forwarded-for') ?? 'anon'

  const { success } = await aiChatRateLimit.limit(identifier)
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded. Try again in an hour.' }, { status: 429 })

  const body = await req.json() as { messages: AIStylingMessage[]; context_product_id?: string }
  const { messages, context_product_id } = body

  let contextInfo = ''
  if (context_product_id) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('name, price, category:categories(name)')
      .eq('id', context_product_id)
      .single()
    if (product) {
      const cat = (product as Record<string, unknown>).category as { name: string } | null
      contextInfo = `\n\nCustomer is viewing: ${product.name} (${cat?.name ?? ''}, ₹${(product.price as number) / 100})`
    }
  }

  const systemPrompt = `You are Zari's personal styling assistant — warm, knowledgeable about Indian women's fashion. Help with outfit ideas, occasion dressing, styling tips, and size advice. Be concise (under 120 words). ${contextInfo}`

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 400,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      })
      for await (const event of response) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
        }
        if (event.type === 'message_stop') {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      }
    },
  })

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
