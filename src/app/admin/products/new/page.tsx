'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Sparkles, Upload, X, Plus } from 'lucide-react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

const productSchema = z.object({
  name: z.string().min(2),
  category_id: z.string().uuid(),
  price: z.number().min(1),
  compare_price: z.number().optional(),
  sku: z.string().min(1),
  material: z.string().optional(),
  care_instructions: z.string().optional(),
  origin: z.string().optional(),
  weight_grams: z.number().optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
})

type ProductForm = z.infer<typeof productSchema>

interface Props {
  categories: { id: string; name: string }[]
}

export default function NewProductPage() {
  const router = useRouter()
  const [images, setImages] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [description, setDescription] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [instagramCaption, setInstagramCaption] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  // Load categories on mount
  useState(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories || []))
  })

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { is_active: true, is_featured: false, origin: 'India' },
  })

  const name = watch('name')
  const category_id = watch('category_id')

  async function uploadImage(file: File) {
    setUploadLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'products')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        setImages(prev => [...prev, data.url])
        toast.success('Image uploaded')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadLoading(false)
    }
  }

  async function generateAI() {
    if (!name) { toast.error('Enter a product name first'); return }
    setAiLoading(true)
    try {
      const categoryName = categories.find(c => c.id === category_id)?.name || ''
      const res = await fetch('/api/products/ai-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: categoryName, material: watch('material'), tags }),
      })
      const data = await res.json()
      if (data.description) setDescription(data.description)
      if (data.short_description) setShortDescription(data.short_description)
      if (data.instagram_caption) setInstagramCaption(data.instagram_caption)
      toast.success('AI content generated!')
    } catch {
      toast.error('AI generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  function addTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (tag && !tags.includes(tag)) {
        setTags(prev => [...prev, tag])
      }
      setTagInput('')
    }
  }

  async function onSubmit(data: ProductForm) {
    if (images.length === 0) { toast.error('Add at least one product image'); return }
    if (!description) { toast.error('Add a description or generate with AI'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          price: Math.round(data.price * 100), // convert to paise
          compare_price: data.compare_price ? Math.round(data.compare_price * 100) : null,
          images,
          tags,
          description,
          short_description: shortDescription,
          ai_description: instagramCaption,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      toast.success('Product created!')
      router.push('/admin/products')
    } catch (err: any) {
      toast.error(err.message || 'Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#faf9f7]">
      <AdminSidebar />
      <main className="flex-1 p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>Add New Product</h1>
          <button onClick={() => router.back()} className="text-sm text-[#888] hover:text-[#1a1a1a] transition-colors">← Back</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <div className="bg-white border border-[#ede9e3] rounded-lg p-6">
                <h2 className="font-medium mb-4">Basic Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Product Name *</label>
                    <input {...register('name')} className="input" placeholder="e.g. Floral Embroidered Kurta" />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="label">Category *</label>
                    <select {...register('category_id')} className="input">
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {errors.category_id && <p className="text-xs text-red-500 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="label">SKU *</label>
                    <input {...register('sku')} className="input" placeholder="ZR-KRT-001" />
                    {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku.message}</p>}
                  </div>
                  <div>
                    <label className="label">Price (₹) *</label>
                    <input {...register('price', { valueAsNumber: true })} type="number" className="input" placeholder="999" />
                    {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
                  </div>
                  <div>
                    <label className="label">Compare Price / MRP (₹)</label>
                    <input {...register('compare_price', { valueAsNumber: true })} type="number" className="input" placeholder="1499" />
                  </div>
                  <div>
                    <label className="label">Material</label>
                    <input {...register('material')} className="input" placeholder="Cotton, Silk, Georgette..." />
                  </div>
                  <div>
                    <label className="label">Origin</label>
                    <input {...register('origin')} className="input" placeholder="Jaipur, India" />
                  </div>
                  <div>
                    <label className="label">Weight (grams)</label>
                    <input {...register('weight_grams', { valueAsNumber: true })} type="number" className="input" placeholder="300" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Care Instructions</label>
                    <input {...register('care_instructions')} className="input" placeholder="Dry clean only / Machine wash cold" />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white border border-[#ede9e3] rounded-lg p-6">
                <label className="label mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-[#f5f0e8] text-xs rounded">
                      {tag}
                      <button type="button" onClick={() => setTags(t => t.filter(x => x !== tag))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                  className="input text-sm"
                  placeholder="Type tag and press Enter (e.g. floral, cotton, festive)"
                />
              </div>

              {/* Description */}
              <div className="bg-white border border-[#ede9e3] rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-medium">Description</h2>
                  <button
                    type="button"
                    onClick={generateAI}
                    disabled={aiLoading}
                    className="flex items-center gap-2 text-xs px-3 py-1.5 bg-[#1a1a1a] text-[#e8c97a] rounded hover:bg-[#333] transition-colors disabled:opacity-50"
                  >
                    <Sparkles size={13} />
                    {aiLoading ? 'Generating...' : 'Generate with AI'}
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="label">Short Description (shown on cards)</label>
                    <input
                      value={shortDescription}
                      onChange={e => setShortDescription(e.target.value)}
                      className="input"
                      placeholder="One compelling sentence about the product"
                    />
                  </div>
                  <div>
                    <label className="label">Full Description *</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="input resize-none"
                      rows={6}
                      placeholder="Detailed product description..."
                    />
                  </div>
                  {instagramCaption && (
                    <div>
                      <label className="label">Instagram Caption (AI generated)</label>
                      <textarea
                        value={instagramCaption}
                        onChange={e => setInstagramCaption(e.target.value)}
                        className="input resize-none text-sm"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Images */}
              <div className="bg-white border border-[#ede9e3] rounded-lg p-6">
                <h2 className="font-medium mb-4">Product Images</h2>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {images.map((url, i) => (
                    <div key={url} className="relative aspect-[3/4] bg-[#f5f0e8] rounded overflow-hidden">
                      <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 text-[10px] bg-[#1a1a1a] text-white px-1.5 py-0.5 rounded">Main</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-[3/4] border-2 border-dashed border-[#ede9e3] rounded flex flex-col items-center justify-center cursor-pointer hover:border-[#1a1a1a] transition-colors">
                    {uploadLoading ? (
                      <div className="w-6 h-6 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Upload size={20} className="text-[#bbb]" />
                        <span className="text-xs text-[#bbb] mt-1">Upload</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])}
                    />
                  </label>
                </div>
                <p className="text-xs text-[#999]">First image is the main image. Max 5MB each.</p>
              </div>

              {/* Visibility */}
              <div className="bg-white border border-[#ede9e3] rounded-lg p-6">
                <h2 className="font-medium mb-4">Visibility</h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register('is_active')} className="accent-[#1a1a1a]" />
                    <div>
                      <p className="text-sm font-medium">Active</p>
                      <p className="text-xs text-[#999]">Visible in store</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register('is_featured')} className="accent-[#1a1a1a]" />
                    <div>
                      <p className="text-sm font-medium">Featured</p>
                      <p className="text-xs text-[#999]">Show on homepage</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-4 text-sm tracking-widest uppercase"
              >
                {submitting ? 'Saving...' : 'Create Product'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
