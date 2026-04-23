import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import sharp from 'sharp'

const BUCKET = 'product-images'

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: pd } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  const profile = pd as { role: string } | null
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const folder = (formData.get('folder') as string) || 'products'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP allowed' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const optimised = await sharp(buffer)
    .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()

  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(fileName, optimised, { contentType: 'image/webp', cacheControl: '31536000' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(data.path)
  return NextResponse.json({ url: publicUrl, path: data.path })
}
