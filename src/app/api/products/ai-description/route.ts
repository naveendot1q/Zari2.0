import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateProductDescription } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: pd } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  const profile = pd as { role: string } | null
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json() as { name: string; category: string; material?: string; tags?: string[] }
  const result = await generateProductDescription(body)
  return NextResponse.json(result)
}
