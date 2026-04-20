'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useCart } from '@/hooks/useCart'
import { formatPaise } from '@/lib/stripe'
import type { AddressSnapshot } from '@/types'

const schema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile number'),
  line1: z.string().min(5, 'Address is required'),
  line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter valid 6-digit pincode'),
  payment_method: z.enum(['stripe', 'cod']),
  coupon_code: z.string().optional(),
  notes: z.string().optional(),
})
type Form = z.infer<typeof schema>

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh']

export default function CheckoutPage() {
  const { user } = useUser()
  const router = useRouter()
  const { items, summary, clearCart } = useCart()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user?.fullName ?? '',
      payment_method: 'stripe',
    },
  })

  const paymentMethod = watch('payment_method')

  async function onSubmit(data: Form) {
    if (!user) { router.push('/auth/sign-in'); return }
    if (items.length === 0) { toast.error('Your cart is empty'); return }
    setLoading(true)
    try {
      const address: AddressSnapshot = {
        full_name: data.full_name,
        phone: '+91' + data.phone,
        line1: data.line1,
        line2: data.line2 ?? null,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, payment_method: data.payment_method, coupon_code: data.coupon_code, notes: data.notes }),
      })
      const result = await res.json() as { order_id?: string; checkout_url?: string; error?: string }
      if (!res.ok) throw new Error(result.error ?? 'Checkout failed')
      clearCart()
      if (data.payment_method === 'stripe' && result.checkout_url) {
        window.location.href = result.checkout_url
      } else {
        router.push(`/shop/orders/${result.order_id}?placed=true`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="section py-8 md:py-12 max-w-5xl">
          <h1 className="text-3xl font-light mb-8" style={{ fontFamily: 'var(--font-display)' }}>Checkout</h1>
          <form onSubmit={(e) => { void handleSubmit(onSubmit)(e) }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white border border-[#ede9e3] rounded-lg p-6">
                  <h2 className="font-medium mb-5">Delivery Address</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1">
                      <label className="label">Full Name *</label>
                      <input {...register('full_name')} className="input" placeholder="As on ID" />
                      {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="label">Mobile Number *</label>
                      <div className="flex">
                        <span className="input w-14 flex-shrink-0 bg-[#f5f0e8] text-[#666] text-center text-sm">+91</span>
                        <input {...register('phone')} className="input rounded-l-none border-l-0" placeholder="9876543210" maxLength={10} />
                      </div>
                      {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                    </div>
                    <div className="col-span-2">
                      <label className="label">Address Line 1 *</label>
                      <input {...register('line1')} className="input" placeholder="House no., Building, Street" />
                      {errors.line1 && <p className="text-xs text-red-500 mt-1">{errors.line1.message}</p>}
                    </div>
                    <div className="col-span-2">
                      <label className="label">Address Line 2</label>
                      <input {...register('line2')} className="input" placeholder="Area, Colony, Landmark (optional)" />
                    </div>
                    <div>
                      <label className="label">Pincode *</label>
                      <input {...register('pincode')} className="input" placeholder="110001" maxLength={6} />
                      {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode.message}</p>}
                    </div>
                    <div>
                      <label className="label">City *</label>
                      <input {...register('city')} className="input" placeholder="New Delhi" />
                      {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
                    </div>
                    <div className="col-span-2">
                      <label className="label">State *</label>
                      <select {...register('state')} className="input">
                        <option value="">Select state</option>
                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state.message}</p>}
                    </div>
                    <div className="col-span-2">
                      <label className="label">Order Notes (optional)</label>
                      <textarea {...register('notes')} className="input resize-none" rows={2} placeholder="Special instructions..." />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#ede9e3] rounded-lg p-6">
                  <h2 className="font-medium mb-5">Payment Method</h2>
                  <div className="space-y-3">
                    {[
                      { value: 'stripe', label: 'Pay Online', sub: 'Credit/Debit Card, UPI, Net Banking', icon: '💳' },
                      { value: 'cod', label: 'Cash on Delivery', sub: 'Pay when your order arrives', icon: '💵' },
                    ].map(opt => (
                      <label key={opt.value} className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${paymentMethod === opt.value ? 'border-[#1a1a1a] bg-[#faf9f7]' : 'border-[#ede9e3]'}`}>
                        <input type="radio" value={opt.value} {...register('payment_method')} className="accent-[#1a1a1a]" />
                        <span className="text-xl">{opt.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-[#888]">{opt.sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {paymentMethod === 'cod' && (
                    <p className="text-xs text-[#888] mt-3 bg-orange-50 p-3 rounded border border-orange-100">
                      ⚠️ COD orders add ₹40 handling charge. Please keep exact change ready.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="bg-white border border-[#ede9e3] rounded-lg p-6 sticky top-24">
                  <h2 className="font-medium mb-4">Order Summary</h2>
                  <div className="space-y-3 mb-4">
                    {items.slice(0, 3).map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-[#666] truncate flex-1 mr-2">{item.product?.name} × {item.quantity}</span>
                        <span className="flex-shrink-0">{formatPaise((item.product?.price ?? 0) * item.quantity)}</span>
                      </div>
                    ))}
                    {items.length > 3 && <p className="text-xs text-[#999]">+{items.length - 3} more items</p>}
                  </div>
                  <div>
                    <label className="label">Coupon Code</label>
                    <div className="flex gap-2 mb-4">
                      <input {...register('coupon_code')} className="input flex-1 text-sm" placeholder="ZARI10" />
                      <button type="button" className="btn-outline px-3 py-2 text-xs">Apply</button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm border-t border-[#ede9e3] pt-4">
                    <div className="flex justify-between"><span className="text-[#666]">Subtotal</span><span>{formatPaise(summary.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-[#666]">Shipping</span><span>{summary.shipping === 0 ? 'Free' : formatPaise(summary.shipping)}</span></div>
                    <div className="flex justify-between"><span className="text-[#666]">GST (5%)</span><span>{formatPaise(summary.tax)}</span></div>
                    {paymentMethod === 'cod' && <div className="flex justify-between text-orange-600"><span>COD Charge</span><span>+₹40</span></div>}
                    <div className="flex justify-between font-medium text-base pt-2 border-t border-[#ede9e3]">
                      <span>Total</span>
                      <span>{formatPaise(summary.total + (paymentMethod === 'cod' ? 4000 : 0))}</span>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full mt-5 py-4 text-sm tracking-widest uppercase">
                    {loading ? 'Placing Order...' : paymentMethod === 'cod' ? 'Place Order' : 'Proceed to Payment'}
                  </button>
                  <p className="text-xs text-[#999] text-center mt-3">🔒 Secured by Stripe</p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
