import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-white/60 mt-16">
      <div className="section py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-[#e8c97a] text-2xl font-light tracking-[6px]" style={{ fontFamily: 'var(--font-display)' }}>
              ZARI
            </span>
            <p className="text-xs mt-3 leading-relaxed">
              Premium women's fashion. Rooted in Indian craft, styled for today.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="https://instagram.com/zari" target="_blank" rel="noopener noreferrer"
                className="text-white/40 hover:text-[#e8c97a] transition-colors text-xs uppercase tracking-widest">
                Instagram
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <p className="text-white/90 text-xs uppercase tracking-widest mb-4">Shop</p>
            {[
              { href: '/shop/products?category=kurtas-suits', label: 'Kurtas & Suits' },
              { href: '/shop/products?category=sarees', label: 'Sarees' },
              { href: '/shop/products?category=lehengas', label: 'Lehengas' },
              { href: '/shop/products?category=western-wear', label: 'Western Wear' },
              { href: '/shop/products?new=true', label: 'New Arrivals' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="block text-xs py-1 hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Help */}
          <div>
            <p className="text-white/90 text-xs uppercase tracking-widest mb-4">Help</p>
            {[
              { href: '/pages/size-guide', label: 'Size Guide' },
              { href: '/pages/shipping', label: 'Shipping Policy' },
              { href: '/pages/returns', label: 'Returns & Exchanges' },
              { href: '/pages/faq', label: 'FAQ' },
              { href: '/contact', label: 'Contact Us' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="block text-xs py-1 hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Legal */}
          <div>
            <p className="text-white/90 text-xs uppercase tracking-widest mb-4">Legal</p>
            {[
              { href: '/pages/privacy', label: 'Privacy Policy' },
              { href: '/pages/terms', label: 'Terms of Service' },
              { href: '/pages/refund', label: 'Refund Policy' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="block text-xs py-1 hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs">© {new Date().getFullYear()} Zari. All rights reserved. Made with ♥ in India.</p>
          <div className="flex items-center gap-3 text-xs">
            <span>🔒 Secure Payments</span>
            <span>·</span>
            <span>💳 Stripe · UPI · COD</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
