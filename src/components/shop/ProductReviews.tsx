import { supabaseAdmin } from '@/lib/supabase'

interface Props { productId: string }

export async function ProductReviews({ productId }: Props) {
  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('*, profile:profiles(full_name, avatar_url)')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!reviews || reviews.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-light mb-4" style={{ fontFamily: 'var(--font-display)' }}>Reviews</h2>
        <p className="text-[#999] text-sm">No reviews yet. Be the first to review this product!</p>
      </div>
    )
  }

  const avgRating = reviews.reduce((s, r) => s + ((r as Record<string, unknown>).rating as number), 0) / reviews.length

  return (
    <div>
      <div className="flex items-baseline gap-4 mb-6">
        <h2 className="text-2xl font-light" style={{ fontFamily: 'var(--font-display)' }}>Reviews</h2>
        <div className="flex items-center gap-2">
          <span className="text-[#e8c97a]">{'★'.repeat(Math.round(avgRating))}</span>
          <span className="text-sm text-[#888]">{avgRating.toFixed(1)} · {reviews.length} reviews</span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {reviews.map((review) => {
          const r = review as Record<string, unknown>
          const prof = r.profile as Record<string, unknown> | null
          return (
            <div key={r.id as string} className="bg-[#faf9f7] rounded-lg p-4 border border-[#ede9e3]">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#e8c97a] rounded-full flex items-center justify-center text-[#1a1a1a] text-xs font-medium">
                    {((prof?.full_name as string) ?? 'U')[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{(prof?.full_name as string) ?? 'Customer'}</p>
                    {r.is_verified_purchase && <p className="text-[10px] text-green-600">✓ Verified Purchase</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className={`text-sm ${s <= (r.rating as number) ? 'text-[#e8c97a]' : 'text-[#ddd]'}`}>★</span>
                  ))}
                </div>
              </div>
              {r.title && <p className="text-sm font-medium mb-1">{r.title as string}</p>}
              {r.body && <p className="text-sm text-[#666] leading-relaxed">{r.body as string}</p>}
              <p className="text-xs text-[#bbb] mt-2">
                {new Date(r.created_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
