'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'
import { Search, ShoppingBag, Heart, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useCartCount } from '@/hooks/useCart'

export function Navbar() {
  const pathname = usePathname()
  const { isSignedIn } = useUser()
  const cartCount = useCartCount()
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = [
    { href: '/shop/products', label: 'All' },
    { href: '/shop/products?category=kurtas-suits', label: 'Kurtas' },
    { href: '/shop/products?category=sarees', label: 'Sarees' },
    { href: '/shop/products?category=lehengas', label: 'Lehengas' },
    { href: '/shop/products?category=western-wear', label: 'Western' },
    { href: '/shop/products?new=true', label: 'New In' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#ede9e3]">
      <div className="section">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-light tracking-[6px]"
            style={{ fontFamily: 'var(--font-display)' }}>
            ZARI
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-xs tracking-widest uppercase transition-colors hover:text-[#1a1a1a] ${
                  pathname === l.href ? 'text-[#1a1a1a] font-medium' : 'text-[#888]'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-4">
            <Link href="/shop/search" className="p-1 text-[#666] hover:text-[#1a1a1a] transition-colors">
              <Search size={20} />
            </Link>

            {isSignedIn && (
              <Link href="/shop/wishlist" className="p-1 text-[#666] hover:text-[#1a1a1a] transition-colors">
                <Heart size={20} />
              </Link>
            )}

            <Link href="/shop/cart" className="p-1 text-[#666] hover:text-[#1a1a1a] transition-colors relative">
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#1a1a1a] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {isSignedIn ? (
              <UserButton />
            ) : (
              <Link href="/auth/sign-in" className="text-xs tracking-widest uppercase text-[#666] hover:text-[#1a1a1a] transition-colors">
                Sign In
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-1 text-[#666]"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-[#ede9e3]">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block py-3 text-sm text-[#666] hover:text-[#1a1a1a] transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
