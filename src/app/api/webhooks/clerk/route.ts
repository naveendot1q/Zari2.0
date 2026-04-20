import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { supabaseAdmin } from '@/lib/supabase'
import { sendWelcomeEmail } from '@/lib/resend'
import type { Profile } from '@/types'

interface ClerkEvent {
  type: string
  data: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headers = {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  }

  let event: ClerkEvent
  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
    event = wh.verify(body, headers) as ClerkEvent
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { type, data } = event
  const emailAddresses = data.email_addresses as { email_address: string }[] | undefined
  const phoneNumbers = data.phone_numbers as { phone_number: string }[] | undefined
  const email = emailAddresses?.[0]?.email_address ?? ''

  if (type === 'user.created') {
    const profile = {
      id: data.id as string,
      email,
      full_name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
      phone: phoneNumbers?.[0]?.phone_number ?? null,
      avatar_url: (data.image_url as string) ?? null,
      role: 'customer' as const,
    }
    await supabaseAdmin.from('profiles').upsert(profile)
    if (email) await sendWelcomeEmail(profile as unknown as Profile)
  }

  if (type === 'user.updated') {
    await supabaseAdmin.from('profiles').update({
      email,
      full_name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
      phone: phoneNumbers?.[0]?.phone_number ?? null,
      avatar_url: (data.image_url as string) ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', data.id as string)
  }

  if (type === 'user.deleted') {
    await supabaseAdmin.from('profiles').delete().eq('id', data.id as string)
  }

  return NextResponse.json({ success: true })
}
