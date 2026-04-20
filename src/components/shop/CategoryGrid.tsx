import Link from 'next/link'
import Image from 'next/image'
import type { Category } from '@/types'

interface Props {
  categories: Category[]
}

// Placeholder colors for categories without images
const bgColors = [
  '#f5e6cc', '#e8d5c4', '#d4c5b5', '#edd9c8',
  '#e6ddd4', '#d9cfc8', '#ede0d4', '#e0d4cc',
  '#ddd0c4', '#d4c8bc',
]

export function CategoryGrid({ categories }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {categories.map((cat, i) => (
        <Link
          key={cat.id}
          href={`/shop/products?category=${cat.slug}`}
          className="group relative aspect-square rounded-lg overflow-hidden"
          style={{ background: bgColors[i % bgColors.length] }}
        >
          {cat.image_url ? (
            <Image
              src={cat.image_url}
              alt={cat.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-white text-sm font-medium leading-tight">{cat.name}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
