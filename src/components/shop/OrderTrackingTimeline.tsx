'use client'

import { useEffect, useState } from 'react'
import type { OrderStatus } from '@/types'

interface Props {
  status: OrderStatus
  paymentMethod: 'stripe' | 'cod'
  awbCode?: string
  courierName?: string
  trackingUrl?: string
  createdAt: string
  updatedAt: string
}

interface Step {
  key: OrderStatus
  label: string
  description: string
  icon: string
}

const STEPS: Step[] = [
  { key: 'pending',          label: 'Order Placed',       description: 'We received your order',            icon: '📋' },
  { key: 'confirmed',        label: 'Confirmed',          description: 'Order confirmed and verified',       icon: '✓'  },
  { key: 'processing',       label: 'Processing',         description: 'Being packed and prepared',          icon: '📦' },
  { key: 'shipped',          label: 'Shipped',            description: 'On its way to you',                  icon: '🚚' },
  { key: 'out_for_delivery', label: 'Out for Delivery',   description: 'With your delivery partner',         icon: '🏃' },
  { key: 'delivered',        label: 'Delivered',          description: 'Arrived at your doorstep',           icon: '🎉' },
]

const CANCEL_STEPS: Step[] = [
  { key: 'pending',    label: 'Order Placed',   description: 'We received your order',       icon: '📋' },
  { key: 'cancelled',  label: 'Cancelled',      description: 'This order was cancelled',     icon: '✕'  },
]

const RETURN_STEPS: Step[] = [
  { key: 'delivered',         label: 'Delivered',         description: 'Order delivered',              icon: '✓'  },
  { key: 'return_requested',  label: 'Return Requested',  description: 'Return request received',      icon: '↩️' },
  { key: 'returned',          label: 'Returned',          description: 'Refund will be processed',     icon: '✓'  },
]

const STATUS_ORDER: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered',
]

function getSteps(status: OrderStatus): Step[] {
  if (status === 'cancelled') return CANCEL_STEPS
  if (status === 'return_requested' || status === 'returned') return RETURN_STEPS
  return STEPS
}

function getStepIndex(status: OrderStatus, steps: Step[]): number {
  return steps.findIndex(s => s.key === status)
}

export function OrderTrackingTimeline({
  status, paymentMethod, awbCode, courierName, trackingUrl, createdAt, updatedAt,
}: Props) {
  const steps = getSteps(status)
  const currentIndex = getStepIndex(status, steps)
  const isCancelled = status === 'cancelled'
  const isReturning = status === 'return_requested' || status === 'returned'

  const estimatedDelivery = (() => {
    const d = new Date(createdAt)
    d.setDate(d.getDate() + 7)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
  })()

  return (
    <div>
      {/* ETA Banner */}
      {!isCancelled && !isReturning && status !== 'delivered' && (
        <div className="bg-[#faf9f7] border border-[#ede9e3] rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#888]">Estimated delivery</p>
            <p className="text-sm font-medium">{estimatedDelivery}</p>
          </div>
          {awbCode && (
            <div className="text-right">
              <p className="text-xs text-[#888]">AWB</p>
              <p className="text-sm font-mono">{awbCode}</p>
            </div>
          )}
          {courierName && (
            <div className="text-right">
              <p className="text-xs text-[#888]">Courier</p>
              <p className="text-sm font-medium">{courierName}</p>
            </div>
          )}
        </div>
      )}

      {/* Timeline Steps */}
      <div className="relative">
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex
          const isCurrent = i === currentIndex
          const isPending = i > currentIndex

          let dotStyle = ''
          let textStyle = ''

          if (isCancelled && step.key === 'cancelled') {
            dotStyle = 'bg-red-500 border-red-500'
            textStyle = 'text-red-600'
          } else if (isCompleted || isCurrent) {
            dotStyle = 'bg-[#1a1a1a] border-[#1a1a1a]'
            textStyle = isCurrent ? 'text-[#1a1a1a]' : 'text-[#555]'
          } else {
            dotStyle = 'bg-white border-[#ddd]'
            textStyle = 'text-[#bbb]'
          }

          const isLast = i === steps.length - 1

          return (
            <div key={step.key} className="flex gap-4 relative">
              {/* Connector line */}
              {!isLast && (
                <div className="absolute left-[11px] top-7 bottom-0 w-[2px]"
                  style={{
                    background: isCompleted
                      ? '#1a1a1a'
                      : 'repeating-linear-gradient(to bottom, #ddd 0, #ddd 4px, transparent 4px, transparent 8px)',
                    minHeight: '32px',
                  }}
                />
              )}

              {/* Dot */}
              <div className="flex-shrink-0 relative z-10 mt-1">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${dotStyle} transition-all duration-300`}>
                  {(isCompleted || isCurrent) && (
                    <span className="text-white text-[10px] font-bold leading-none">
                      {isCancelled && step.key === 'cancelled' ? '✕' : step.key === 'delivered' ? '✓' : (i + 1)}
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className={`pb-6 flex-1 ${textStyle}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm font-medium leading-snug ${isCurrent ? 'text-[#1a1a1a]' : ''}`}>
                      {step.icon} {step.label}
                      {isCurrent && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-[#1a1a1a] text-white px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5 opacity-80">{step.description}</p>
                  </div>
                  {isCurrent && (
                    <p className="text-xs text-[#999] flex-shrink-0">
                      {new Date(updatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* COD reminder */}
      {paymentMethod === 'cod' && status !== 'delivered' && status !== 'cancelled' && (
        <div className="mt-2 p-3 bg-orange-50 border border-orange-100 rounded-lg">
          <p className="text-xs text-orange-700">
            💵 This is a Cash on Delivery order. Please keep the exact amount ready at delivery.
          </p>
        </div>
      )}

      {/* Track button */}
      {trackingUrl && (status === 'shipped' || status === 'out_for_delivery') && (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full py-3 border border-[#1a1a1a] text-sm font-medium hover:bg-[#1a1a1a] hover:text-white transition-all duration-200"
        >
          🚚 Live Track on {courierName || 'Courier'} →
        </a>
      )}
    </div>
  )
}
