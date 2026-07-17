'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * The Gallery page is now powered by the centralized Media Library.
 * This component redirects to the Media Library with gallery category pre-selected.
 */
export default function GalleryPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/media?category=gallery')
  }, [])

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full spinner mx-auto"
          style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Redirecting to Media Library...
        </p>
      </div>
    </div>
  )
}
