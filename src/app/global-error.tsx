'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
    try {
      Sentry.captureException(error)
    } catch {}
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif', background: '#faf9f7', padding: '2rem',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 400, marginBottom: '12px' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '8px' }}>
            We&apos;ve been notified and are looking into it.
          </p>
          {error?.message && (
            <p style={{ color: '#bbb', fontSize: '12px', marginBottom: '24px', fontFamily: 'monospace' }}>
              {error.message}
            </p>
          )}
          <button
            onClick={reset}
            style={{ background: '#1a1a1a', color: '#fff', border: 'none', padding: '12px 28px', fontSize: '14px', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
