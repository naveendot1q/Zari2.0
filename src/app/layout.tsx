import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'react-hot-toast'
import { PostHogProvider } from '@/components/layout/PostHogProvider'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Zari — Women\'s Fashion', template: '%s | Zari' },
  description: 'Discover handpicked kurtas, sarees, lehengas and more. Shop premium Indian women\'s fashion with free delivery above ₹500.',
  keywords: ['women fashion', 'kurtas', 'sarees', 'lehengas', 'indian clothing', 'ethnic wear'],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Zari',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <PostHogProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: { background: '#1a1a1a', color: '#fff', fontSize: '14px' },
              }}
            />
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
