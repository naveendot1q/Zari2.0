import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { mapShiprocketStatus } from '@/lib/shiprocket'
import { sendShippingUpdate, sendDeliveryConfirmation } from '@/lib/resend'
import type { Order, Profile } from '@/types'

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>
  const awbCode = (body.awb ?? body.awb_code) as string | undefined
  const srStatus = (body.current_status ?? body.status) as string | undefined
  const trackingUrl = body.courier_tracking_url as string | undefined

  if (!awbCode || !srStatus) {
    return NextResponse.json({ error: 'Missing AWB or status' }, { status: 400 })
  }

  const ourStatus = mapShiprocketStatus(srStatus)

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*, profile:profiles(*)')
    .eq('awb_code', awbCode)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  await supabaseAdmin.from('orders').update({
    status: ourStatus,
    courier_name: (body.courier_name as string) ?? order.courier_name,
    tracking_url: trackingUrl ?? order.tracking_url,
  }).eq('id', order.id)

  const profile = (order as Record<string, unknown>).profile as Profile | null
  if (profile) {
    const updatedOrder = { ...order, status: ourStatus } as unknown as Order
    if (ourStatus === 'shipped') await sendShippingUpdate(updatedOrder, profile)
    if (ourStatus === 'delivered') await sendDeliveryConfirmation(updatedOrder, profile)
  }

  return NextResponse.json({ success: true })
}
