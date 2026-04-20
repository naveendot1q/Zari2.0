import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('sort_order')
  return NextResponse.json({ categories: data ?? [] })
}
