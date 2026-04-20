'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { ExternalLink } from 'lucide-react'

interface Props {
  orderId: string
  currentStatus: string
  awbCode?: string
  trackingUrl?: string
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
  delivered: ['return_requested'],
  return_requested: ['returned', 'delivered'],
}

export function AdminOrderActions({ orderId, currentStatus, awbCode, trackingUrl }: Props) {
  const [updating, setUpdating] = useState(false)
  const transitions = STATUS_TRANSITIONS[currentStatus] || []

  async function updateStatus(status: string) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Order ${status}`)
      window.location.reload()
    } catch {
      toast.error('Update failed')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {transitions.slice(0, 2).map(status => (
        <button
          key={status}
          onClick={() => updateStatus(status)}
          disabled={updating}
          className="text-[10px] px-2 py-1 border border-[#ede9e3] hover:bg-[#f5f0e8] transition-colors capitalize disabled:opacity-50 rounded"
        >
          {status.replace(/_/g, ' ')}
        </button>
      ))}
      {trackingUrl && (
        <a href={trackingUrl} target="_blank" rel="noopener noreferrer"
          className="p-1 text-[#888] hover:text-[#1a1a1a] transition-colors" title={`Track: ${awbCode}`}>
          <ExternalLink size={13} />
        </a>
      )}
    </div>
  )
}
