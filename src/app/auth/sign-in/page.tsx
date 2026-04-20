import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col items-center justify-center py-12">
      <div className="mb-8 text-center">
        <a href="/" className="text-3xl font-light tracking-[6px]" style={{ fontFamily: 'var(--font-display)' }}>
          ZARI
        </a>
        <p className="text-[#999] text-sm mt-2">Sign in to continue shopping</p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
            card: 'shadow-none border border-[#ede9e3] rounded-xl',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton: 'border border-[#ede9e3] hover:bg-[#faf9f7]',
            formButtonPrimary: 'bg-[#1a1a1a] hover:bg-[#333] text-sm',
            footerActionLink: 'text-[#1a1a1a] font-medium',
          },
        }}
      />
    </div>
  )
}
