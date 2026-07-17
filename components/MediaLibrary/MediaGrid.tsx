'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Copy, Trash2, Eye, Check, Info, Loader2 } from 'lucide-react'

export interface MediaItem {
  id: string
  file_name: string
  public_url: string
  storage_path: string
  category: string
  mime_type: string | null
  file_size: number | null
  width: number | null
  height: number | null
  alt_text: string | null
  used_in: any[]
  created_at: string
}

interface MediaGridProps {
  items: MediaItem[]
  loading?: boolean
  selectable?: boolean
  multiSelect?: boolean
  selected?: string[]
  onSelect?: (id: string, url: string) => void
  onDeselect?: (id: string) => void
  onDelete?: (item: MediaItem) => void
  onDetails?: (item: MediaItem) => void
  skeletonCount?: number
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function SkeletonCard() {
  return (
    <div className="aspect-square rounded-xl overflow-hidden animate-pulse" style={{ background: 'var(--muted)' }}>
      <div className="w-full h-full" style={{ background: 'var(--border)' }} />
    </div>
  )
}

export function MediaGrid({
  items,
  loading = false,
  selectable = false,
  multiSelect = false,
  selected = [],
  onSelect,
  onDeselect,
  onDelete,
  onDetails,
  skeletonCount = 20,
}: MediaGridProps) {
  const supabase = createClient()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<MediaItem | null>(null)

  const isSelected = (id: string) => selected.includes(id)

  function handleClick(item: MediaItem) {
    if (!selectable) { onDetails?.(item); return }
    if (isSelected(item.id)) {
      onDeselect?.(item.id)
    } else {
      onSelect?.(item.id, item.public_url)
    }
  }

  async function handleDelete(e: React.MouseEvent, item: MediaItem) {
    e.stopPropagation()
    const usedIn = Array.isArray(item.used_in) ? item.used_in : []
    if (usedIn.length > 0) {
      const names = usedIn.map((u: any) => u.title || u.type).join(', ')
      if (!confirm(`This image is used in ${usedIn.length} place(s): ${names}\n\nDeleting it will break those pages. Continue?`)) return
    } else {
      if (!confirm('Delete this image permanently?')) return
    }

    setDeleting(item.id)
    try {
      // Delete from storage
      await supabase.storage.from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'saanvi-media')
        .remove([item.storage_path])
      // Delete from DB
      await supabase.from('media').delete().eq('id', item.id)
      toast.success('Image deleted')
      onDelete?.(item)
    } catch (e: any) {
      toast.error('Delete failed: ' + e.message)
    } finally {
      setDeleting(null)
    }
  }

  function copyUrl(e: React.MouseEvent, url: string) {
    e.stopPropagation()
    navigator.clipboard.writeText(url)
    toast.success('URL copied!')
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: skeletonCount }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--muted-foreground)' }}>
        <div className="text-5xl mb-4">🖼️</div>
        <p className="font-semibold text-base" style={{ color: 'var(--foreground)' }}>No images yet</p>
        <p className="text-sm mt-1">Upload your first image to get started</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {items.map(item => {
          const sel = isSelected(item.id)
          const isDeleting = deleting === item.id
          return (
            <div
              key={item.id}
              onClick={() => handleClick(item)}
              className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200"
              style={{
                aspectRatio: '1',
                border: sel
                  ? '3px solid var(--primary)'
                  : '2px solid var(--border)',
                transform: sel ? 'scale(0.97)' : 'scale(1)',
                boxShadow: sel ? '0 0 0 3px color-mix(in srgb, var(--primary) 30%, transparent)' : 'none',
              }}
            >
              {/* Image */}
              <img
                src={item.public_url}
                alt={item.alt_text || item.file_name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />

              {/* Overlay on hover */}
              <div
                className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.7) 100%)' }}
              >
                {/* Top actions */}
                <div className="flex justify-end gap-1">
                  <button
                    onClick={e => { e.stopPropagation(); onDetails?.(item) }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition hover:bg-white/30"
                    title="Details"
                  >
                    <Info size={13} />
                  </button>
                  <button
                    onClick={e => copyUrl(e, item.public_url)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition hover:bg-white/30"
                    title="Copy URL"
                  >
                    <Copy size={13} />
                  </button>
                  {onDelete && (
                    <button
                      onClick={e => handleDelete(e, item)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition hover:bg-red-500/80"
                      title="Delete"
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 size={12} className="spinner" /> : <Trash2 size={13} />}
                    </button>
                  )}
                </div>

                {/* Bottom: filename */}
                <p className="text-white text-xs font-medium truncate"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {item.file_name}
                </p>
              </div>

              {/* Selection checkmark */}
              {selectable && (
                <div
                  className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    background: sel ? 'var(--primary)' : 'rgba(255,255,255,0.8)',
                    border: sel ? 'none' : '2px solid rgba(0,0,0,0.3)',
                    opacity: sel ? 1 : 0,
                  }}
                >
                  {sel && <Check size={12} className="text-white" />}
                </div>
              )}
              {selectable && !sel && (
                <div
                  className="absolute top-2 left-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.8)', border: '2px solid rgba(0,0,0,0.3)' }}
                />
              )}

              {/* Deleting overlay */}
              {isDeleting && (
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'rgba(220,38,38,0.7)' }}>
                  <Loader2 size={20} className="spinner text-white" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Full preview modal */}
      {previewing && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setPreviewing(null)}
        >
          <img
            src={previewing.public_url}
            alt={previewing.file_name}
            className="max-w-full max-h-full object-contain rounded-xl"
            style={{ maxHeight: '90vh' }}
          />
        </div>
      )}
    </>
  )
}
