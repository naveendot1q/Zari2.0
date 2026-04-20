'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send } from 'lucide-react'
import type { Product, AIStylingMessage } from '@/types'

interface Props {
  contextProduct?: Product | null
}

export function AiStylistButton({ contextProduct }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AIStylingMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = contextProduct
        ? `Hi! I\u2019m Zari\u2019s styling assistant \u2728 I see you\u2019re looking at the **${contextProduct.name}**. Would you like styling tips, occasion suggestions, or size advice?`
        : `Hi! I\u2019m Zari\u2019s styling assistant \u2728 Ask me anything \u2014 outfit ideas, occasion dressing, size help, or what to pair with a piece you love!`
      setMessages([{ role: 'assistant', content: greeting }])
    }
  }, [open, contextProduct, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg: AIStylingMessage = { role: 'user', content: input.trim() }
    const allMessages = [...messages, userMsg]
    setMessages([...allMessages, { role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          context_product_id: contextProduct?.id ?? null,
        }),
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const lines = decoder.decode(value).split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6)) as { text: string }
                if (data.text) {
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: updated[updated.length - 1].content + data.text,
                    }
                    return updated
                  })
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'Sorry, I had trouble responding. Please try again!' }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const suggestions = contextProduct
    ? ['How to style this?', 'What size should I get?', 'Occasion ideas']
    : ['Wedding guest outfit', 'Office wear ideas', 'Festival look under \u20b92000']

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-[#1a1a1a] text-[#e8c97a] w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200 group"
          aria-label="Open styling assistant"
        >
          <Sparkles size={22} />
          <span className="absolute right-16 bg-[#1a1a1a] text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            AI Stylist
          </span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] bg-white border border-[#ede9e3] rounded-2xl shadow-2xl flex flex-col" style={{ height: '480px' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#ede9e3] bg-[#1a1a1a] rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#e8c97a]" />
              <span className="text-white text-sm font-medium">Zari Stylist</span>
              <span className="w-2 h-2 bg-green-400 rounded-full" />
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-[#e8c97a] flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                    <Sparkles size={12} className="text-[#1a1a1a]" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#1a1a1a] text-white rounded-tr-sm'
                    : 'bg-[#faf9f7] text-[#1a1a1a] rounded-tl-sm border border-[#ede9e3]'
                }`}>
                  {msg.content || (loading && i === messages.length - 1 ? (
                    <span className="flex gap-1">
                      {[0,150,300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                  ) : '')}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {suggestions.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#ede9e3] text-[#666] hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-[#ede9e3]">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) void sendMessage() }}
                placeholder="Ask about styling, sizes, occasions..."
                className="flex-1 text-sm px-3 py-2.5 border border-[#ede9e3] rounded-xl outline-none focus:border-[#1a1a1a] transition-colors placeholder:text-[#bbb]"
                disabled={loading}
              />
              <button
                onClick={() => { void sendMessage() }}
                disabled={!input.trim() || loading}
                className="w-10 h-10 flex-shrink-0 bg-[#1a1a1a] text-white rounded-xl flex items-center justify-center hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
