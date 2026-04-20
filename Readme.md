# Zari — Women's Fashion E-commerce

A production-ready Next.js e-commerce store for Indian women's clothing with Instagram Shop integration, AI styling assistant, and complete order management.

## Tech Stack

| Layer | Service |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Auth | Clerk |
| Database | Supabase (PostgreSQL + Storage) |
| Payments | Stripe (cards, UPI, net banking) |
| Shipping | Shiprocket (India-wide, COD support) |
| Email | Resend |
| AI | Claude (Anthropic) |
| Vector Search | Pinecone |
| Cache | Upstash Redis |
| Analytics | PostHog |
| Errors | Sentry |
| CDN/Edge | Cloudflare |
| DNS | Namecheap |
| Hosting | Vercel (Mumbai region) |
| Source | GitHub |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/zari.git
cd zari
npm install
cp .env.example .env.local
```

### 2. Set Up Services (in order)

#### Supabase
1. Create project at [supabase.com](https://supabase.com)
2. Run migration: paste `supabase/migrations/001_schema.sql` into SQL Editor
3. Create storage bucket called `product-images` (set to public)
4. Copy project URL and anon/service keys to `.env.local`

#### Clerk
1. Create app at [clerk.com](https://clerk.com)
2. Enable Email + Google login
3. Add webhook pointing to `https://yourdomain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
4. Copy publishable key, secret key, and webhook secret to `.env.local`

#### Stripe
1. Create account at [stripe.com](https://stripe.com)
2. Enable UPI and Net Banking in Dashboard > Payment Methods
3. Add webhook: `https://yourdomain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`
4. Copy publishable key, secret key, webhook secret to `.env.local`

#### Shiprocket
1. Create account at [shiprocket.in](https://shiprocket.in)
2. Set up pickup address in Dashboard
3. Note your Channel ID from Settings
4. Add `.env.local`: email, password, channel ID
5. Configure webhook to `https://yourdomain.com/api/webhooks/shiprocket`

#### Resend
1. Create account at [resend.com](https://resend.com)
2. Add and verify your domain
3. Create API key and add to `.env.local`
4. Set `RESEND_FROM_EMAIL` to `orders@yourdomain.com`

#### Pinecone
1. Create account at [pinecone.io](https://pinecone.io)
2. Create index: **dimension 1024**, metric **cosine**, name **zari-products**
3. Copy API key to `.env.local`
4. (Optional) Sign up for [Voyage AI](https://voyageai.com) for embeddings, add `VOYAGE_API_KEY`

#### Upstash
1. Create account at [upstash.com](https://upstash.com)
2. Create a Redis database (choose Mumbai region)
3. Copy REST URL and token to `.env.local`

#### Anthropic
1. Get API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to `.env.local` as `ANTHROPIC_API_KEY`

#### PostHog
1. Create account at [posthog.com](https://posthog.com)
2. Create project, copy project API key to `.env.local`

#### Sentry
1. Create project at [sentry.io](https://sentry.io)
2. Choose Next.js
3. Copy DSN, auth token, org, project to `.env.local`

#### Instagram / Meta Shop
1. Create Facebook/Meta Developer App
2. Add Instagram Graph API
3. Set up Instagram Shopping (requires business account + product catalog)
4. Configure webhook: `https://yourdomain.com/api/webhooks/instagram`
5. Sync product catalog via Meta Commerce Manager

### 3. Namecheap + Cloudflare DNS

1. Buy domain on [namecheap.com](https://namecheap.com)
2. Create free Cloudflare account, add your domain
3. On Namecheap: change nameservers to Cloudflare's
4. On Cloudflare: add CNAME record pointing to your Vercel deployment URL
5. Enable Cloudflare proxy (orange cloud) for caching + DDoS protection

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Or connect GitHub repo in Vercel dashboard for auto-deploys
```

Set all environment variables from `.env.local` in Vercel Dashboard > Settings > Environment Variables.

The `vercel.json` is pre-configured to deploy to Mumbai region (`bom1`) for low latency in India.

### 5. Set First Admin User

After signing up with your account, run this in Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

Then visit `/admin` to access the admin dashboard.

---

## Project Structure

```
zari/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Homepage
│   │   ├── layout.tsx                  # Root layout (Clerk, PostHog, Sentry)
│   │   ├── globals.css                 # Global styles + design system
│   │   ├── auth/
│   │   │   ├── sign-in/page.tsx        # Clerk sign-in
│   │   │   └── sign-up/page.tsx        # Clerk sign-up
│   │   ├── shop/
│   │   │   ├── products/page.tsx       # Product listing with filters
│   │   │   ├── product/[slug]/page.tsx # Product detail page
│   │   │   ├── cart/page.tsx           # Shopping cart
│   │   │   ├── checkout/page.tsx       # Checkout (address + payment)
│   │   │   ├── orders/page.tsx         # Order history
│   │   │   ├── search/page.tsx         # AI-powered search
│   │   │   └── wishlist/page.tsx       # Saved items
│   │   ├── admin/
│   │   │   ├── page.tsx                # Admin dashboard
│   │   │   ├── products/               # Product management
│   │   │   └── orders/                 # Order management
│   │   └── api/
│   │       ├── products/               # Products CRUD + AI description
│   │       ├── orders/                 # Order creation + tracking
│   │       ├── cart/                   # Cart management
│   │       ├── search/                 # Semantic search
│   │       ├── upload/                 # Image upload (Sharp optimisation)
│   │       ├── wishlist/               # Wishlist management
│   │       ├── categories/             # Category listing
│   │       ├── ai/style/               # Claude styling assistant (streaming)
│   │       └── webhooks/
│   │           ├── stripe/             # Payment confirmation
│   │           ├── shiprocket/         # Shipping updates
│   │           ├── clerk/              # User sync
│   │           └── instagram/          # Social integration
│   ├── components/
│   │   ├── layout/                     # Navbar, Footer, PostHogProvider
│   │   ├── shop/                       # ProductCard, ProductGrid, Cart, etc.
│   │   ├── admin/                      # Admin tables, sidebar, actions
│   │   └── ai/                         # AiStylistButton (floating chat)
│   ├── hooks/
│   │   ├── useCart.ts                  # Zustand cart store + API sync
│   │   └── useWishlist.ts              # Wishlist state
│   ├── lib/
│   │   ├── supabase.ts                 # Browser + server + admin clients
│   │   ├── stripe.ts                   # Stripe + order total calculation
│   │   ├── shiprocket.ts               # Shipping API + token caching
│   │   ├── resend.ts                   # Email templates
│   │   ├── claude.ts                   # AI styling + description generation
│   │   ├── pinecone.ts                 # Vector indexing + semantic search
│   │   ├── upstash.ts                  # Redis cache + rate limiting
│   │   └── posthog.ts                  # Analytics event helpers
│   ├── types/index.ts                  # Full TypeScript type definitions
│   └── middleware.ts                   # Clerk auth + route protection
├── supabase/
│   └── migrations/001_schema.sql       # Complete DB schema + RLS policies
├── cloudflare-worker.js                # Edge caching worker
├── next.config.mjs                     # Sentry + image domains
├── vercel.json                         # Mumbai region + function timeouts
└── .env.example                        # All required environment variables
```

---

## Key Features

### Customer Features
- **Browse & Search**: Category browsing + AI semantic search ("floral kurta under ₹2000")
- **Product Pages**: Multiple images, size/colour selection, stock status, reviews
- **Cart**: Persistent cart, free shipping progress bar, quantity updates
- **Checkout**: Indian address form, 6-digit pincode, state selector, Stripe + COD
- **Orders**: Real-time status updates, shipment tracking, order history
- **Wishlist**: Save and manage favourite items
- **AI Stylist**: Floating chat widget powered by Claude for styling advice

### Admin Features
- **Dashboard**: Revenue, orders, customers analytics (30-day)
- **Product Management**: Create/edit/delete, AI description generation, image upload
- **Order Management**: Status updates, track shipments, filter by status
- **Automatic Workflows**: Stripe → Shiprocket → Email on payment confirmation

### Technical Highlights
- Server Components for SEO and fast initial loads
- Streaming AI responses (real-time chat)
- Cloudflare edge caching for product pages
- Redis caching for catalog data (5-min TTL)
- Rate limiting on checkout (5/min) and AI chat (20/hour)
- Image optimisation via Sharp (WebP, max 1200px, 85% quality)
- Row Level Security on all user data
- GST calculation (5%) + free shipping above ₹500
- COD support with ₹40 handling charge
- Shiprocket token cached in Redis (9-day TTL)

---

## Pricing Estimates (Monthly)

| Service | Free Tier | Paid |
|---|---|---|
| Vercel | Free (hobby) | Pro ₹1,750/mo |
| Supabase | 500MB free | Pro $25/mo |
| Upstash Redis | 10K req/day free | Pay-per-use |
| Pinecone | 1 index free | Starter $70/mo |
| Clerk | 10K MAU free | $25/mo after |
| Resend | 3K emails/mo free | $20/mo |
| Shiprocket | Per shipment | ~₹45–80/shipment |
| Stripe | 2% + ₹2 per txn | — |
| Sentry | 5K errors/mo free | $26/mo |
| PostHog | 1M events free | Free for most |
| Cloudflare | Free | — |

**Estimated starting cost: ~$0–50/month** for low-volume stores.

---

## Development

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run type-check # TypeScript check
npm run lint       # ESLint
```

---

## Support

For questions about this codebase, use the AI Stylist in the store — it knows everything! 😄
