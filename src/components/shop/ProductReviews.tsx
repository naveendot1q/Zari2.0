import { supabaseAdmin } from '@/lib/supabase'

interface ReviewRow {
  id: string
  rating: number
  title: string | null
  body: string | null
  is_verified_purchase: boolean
  created_at: string
  profile: { full_name: string | null; avatar_url: string | null } | null
}

interface Props { productId: string }

export async function ProductReviews({ productId }: Props) {
  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('id, rating, title, body, is_verified_purchase, created_at, profile:profiles(full_name, avatar_url)')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(10)

  const typed = (reviews ?? []) as unknown as ReviewRow[]

  if (typed.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-light mb-4" style={{ fontFamily: 'var(--font-display)' }}>Reviews</h2>
        <p className="text-[#999] text-sm">No reviews yet. Be the first to review this product!</p>
      </div>
    )
  }

  const avgRating = typed.reduce((s, r) => s + r.rating, 0) / typed.length

  return (
    <div>
      <div className="flex items-baseline gap-4 mb-6">
        <h2 className="text-2xl font-light" style={{ fontFamily: 'var(--font-display)' }}>Reviews</h2>
        <div className="flex items-center gap-2">
          <span className="text-[#e8c97a]">{'★'.repeat(Math.round(avgRating))}</span>
          <span className="text-sm text-[#888]">{avgRating.toFixed(1)} · {typed.length} reviews</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {typed.map(review => (
          <div key={review.id} className="bg-[#faf9f7] rounded-lg p-4 border border-[#ede9e3]">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#e8c97a] rounded-full flex items-center justify-center text-[#1a1a1a] text-xs font-medium">
                  {(review.profile?.full_name ?? 'U')[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{review.profile?.full_name ?? 'Customer'}</p>
                  {review.is_verified_purchase && (
                    <p className="text-[10px] text-green-600">✓ Verified Purchase</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => (
                  <span key={s} className={`text-sm ${s <= review.rating ? 'text-[#e8c97a]' : 'text-[#ddd]'}`}>★</span>
                ))}
              </div>
            </div>
            {review.title !== null && <p className="text-sm font-medium mb-1">{review.title}</p>}
            {review.body !== null && <p className="text-sm text-[#666] leading-relaxed">{review.body}</p>}
            <p className="text-xs text-[#bbb] mt-2">
              {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}