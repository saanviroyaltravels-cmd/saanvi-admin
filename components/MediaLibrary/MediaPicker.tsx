'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Search, Upload, Check, ChevronDown } from 'lucide-react'
import { MediaGrid, MediaItem } from './MediaGrid'
import { MediaUploader } from './MediaUploader'
import type { MediaCategory } from './MediaUploader'

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'packages', label: 'Packages' },
  { value: 'offers', label: 'Offers' },
  { value: 'homepage', label: 'Homepage' },
  { value: 'banner', label: 'Banner' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'destinations', label: 'Destinations' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'logos', label: 'Logos' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'general', label: 'General' },
]

const PAGE_SIZE = 40

export interface MediaPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (urls: string[]) => void
  multiSelect?: boolean
  defaultCategory?: MediaCategory | 'all'
  title?: string
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
  multiSelect = false,
  defaultCategory = 'all',
  title = 'Select from Media Library',
}: MediaPickerProps) {
  const supabase = createClient()
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>(defaultCategory)
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [selected, setSelected] = useState<string[]>([])
  const [selectedUrls, setSelectedUrls] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [tab, setTab] = useState<'browse' | 'upload'>('browse')
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>('general')
  const [details, setDetails] = useState<MediaItem | null>(null)

  useEffect(() => {
    if (!open) return
    setSelected([]); setSelectedUrls([]); setSearch(''); setPage(0)
    setItems([])
    load(0, true)
  }, [open, category, sort])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => { setPage(0); setItems([]); load(0, true) }, 350)
    return () => clearTimeout(timer)
  }, [search])

  async function load(pageNum: number, replace = false) {
    setLoading(true)
    let q = supabase.from('media').select('*', { count: 'exact' })
    if (category !== 'all') q = q.eq('category', category)
    if (search) q = q.ilike('file_name', `%${search}%`)
    q = q.order('created_at', { ascending: sort === 'oldest' })
    q = q.range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1)

    const { data, count } = await q
    const rows = (data || []) as MediaItem[]
    setItems(prev => replace ? rows : [...prev, ...rows])
    setHasMore((pageNum + 1) * PAGE_SIZE < (count || 0))
    setLoading(false)
  }

  function loadMore() {
    const next = page + 1
    setPage(next)
    load(next)
  }

  function handleSelect(id: string, url: string) {
    if (multiSelect) {
      setSelected(prev => [...prev, id])
      setSelectedUrls(prev => [...prev, url])
    } else {
      setSelected([id])
      setSelectedUrls([url])
    }
  }

  function handleDeselect(id: string) {
    const idx = selected.indexOf(id)
    setSelected(prev => prev.filter(s => s !== id))
    setSelectedUrls(prev => prev.filter((_, i) => i !== idx))
  }

  function handleUse() {
    onSelect(selectedUrls)
    onClose()
  }

  function handleUploaded(media: { id: string; url: string; name: string }) {
    // Refresh grid after upload
    setTab('browse')
    setPage(0); setItems([]); load(0, true)
    // Auto-select the just-uploaded item
    setSelected([media.id])
    setSelectedUrls([media.url])
  }

  function handleMultiUploaded(medias: { id: string; url: string; name: string }[]) {
    setTab('browse')
    setPage(0); setItems([]); load(0, true)
    if (multiSelect) {
      setSelected(medias.map(m => m.id))
      setSelectedUrls(medias.map(m => m.url))
    } else if (medias[0]) {
      setSelected([medias[0].id])
      setSelectedUrls([medias[0].url])
    }
  }

  function handleDelete(item: MediaItem) {
    setItems(prev => prev.filter(i => i.id !== item.id))
    setSelected(prev => prev.filter(s => s !== item.id))
    setSelectedUrls(prev => {
      const idx = selected.indexOf(item.id)
      return prev.filter((_, i) => i !== idx)
    })
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{
          width: '95vw', maxWidth: '1100px', height: '90vh',
          background: 'var(--background)', border: '1px solid var(--border)'
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg" style={{ color: 'var(--foreground)' }}>{title}</h2>
            {selected.length > 0 && (
              <p className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                {selected.length} image{selected.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--muted)' }}>
            <button
              onClick={() => setTab('browse')}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition"
              style={{
                background: tab === 'browse' ? 'var(--card)' : 'transparent',
                color: tab === 'browse' ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: tab === 'browse' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >Browse</button>
            <button
              onClick={() => setTab('upload')}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5"
              style={{
                background: tab === 'upload' ? 'var(--card)' : 'transparent',
                color: tab === 'upload' ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: tab === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Upload size={13} />Upload New
            </button>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl transition hover:bg-red-50"
            style={{ color: 'var(--muted-foreground)' }}>
            <X size={18} />
          </button>
        </div>

        {tab === 'browse' ? (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b flex-shrink-0"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
              {/* Search */}
              <div className="relative flex-1 min-w-[160px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search images..."
                  style={{ paddingLeft: '2rem', height: '36px', fontSize: '13px' }}
                />
              </div>

              {/* Category filter */}
              <select
                value={category}
                onChange={e => { setCategory(e.target.value); setPage(0); setItems([]) }}
                style={{ width: 'auto', height: '36px', fontSize: '13px' }}
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>

              {/* Sort */}
              <select
                value={sort}
                onChange={e => setSort(e.target.value as any)}
                style={{ width: 'auto', height: '36px', fontSize: '13px' }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            {/* Grid + Details panel */}
            <div className="flex flex-1 overflow-hidden">
              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                <MediaGrid
                  items={items}
                  loading={loading && items.length === 0}
                  selectable
                  multiSelect={multiSelect}
                  selected={selected}
                  onSelect={handleSelect}
                  onDeselect={handleDeselect}
                  onDelete={handleDelete}
                  onDetails={setDetails}
                />

                {/* Load more */}
                {hasMore && !loading && (
                  <button
                    onClick={loadMore}
                    className="mt-4 w-full py-3 rounded-xl text-sm font-semibold transition"
                    style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                  >
                    Load more images
                  </button>
                )}
                {loading && items.length > 0 && (
                  <div className="text-center py-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading...</div>
                )}
              </div>

              {/* Details panel */}
              {details && (
                <DetailsPanel item={details} onClose={() => setDetails(null)}
                  onDeleted={() => { handleDelete(details); setDetails(null) }} />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t flex-shrink-0"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {selected.length > 0
                  ? `${selected.length} image${selected.length > 1 ? 's' : ''} selected`
                  : 'Click an image to select it'
                }
              </p>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-ghost">Cancel</button>
                <button
                  onClick={handleUse}
                  disabled={selected.length === 0}
                  className="btn-primary"
                  style={{ opacity: selected.length === 0 ? 0.4 : 1 }}
                >
                  <Check size={15} />
                  Use Selected {selected.length > 0 ? `(${selected.length})` : ''}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Upload Tab */
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="max-w-lg mx-auto space-y-4">
              <div>
                <label>Upload to Category</label>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value as MediaCategory)}
                >
                  {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <MediaUploader
                category={uploadCategory}
                multiple={multiSelect}
                onUploaded={handleUploaded}
                onMultiUploaded={handleMultiUploaded}
              />
              <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
                Images are automatically compressed to WebP format for optimal performance.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Inline Details Panel ──────────────────────────────────────────────────────
function DetailsPanel({
  item,
  onClose,
  onDeleted,
}: {
  item: MediaItem
  onClose: () => void
  onDeleted: () => void
}) {
  const supabase = createClient()
  const [altText, setAltText] = useState(item.alt_text || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function saveAlt() {
    setSaving(true)
    await supabase.from('media').update({ alt_text: altText }).eq('id', item.id)
    setSaving(false)
  }

  async function handleDelete() {
    const usedIn = Array.isArray(item.used_in) ? item.used_in : []
    const msg = usedIn.length > 0
      ? `Used in ${usedIn.length} place(s). Deleting will break those pages. Continue?`
      : 'Delete this image permanently?'
    if (!confirm(msg)) return
    setDeleting(true)
    await supabase.storage.from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'saanvi-media').remove([item.storage_path])
    await supabase.from('media').delete().eq('id', item.id)
    onDeleted()
  }

  function formatBytes(b: number | null) {
    if (!b) return '—'
    return b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="w-72 flex-shrink-0 border-l overflow-y-auto"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Image Details</p>
          <button onClick={onClose} style={{ color: 'var(--muted-foreground)' }}><X size={14} /></button>
        </div>

        {/* Preview */}
        <img src={item.public_url} alt={item.file_name}
          className="w-full rounded-xl object-cover" style={{ maxHeight: '160px' }} />

        {/* Meta */}
        <div className="space-y-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <div className="flex justify-between">
            <span>Name</span>
            <span className="font-medium truncate ml-2" style={{ color: 'var(--foreground)', maxWidth: '140px' }}>
              {item.file_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Category</span>
            <span className="capitalize font-medium" style={{ color: 'var(--foreground)' }}>{item.category}</span>
          </div>
          <div className="flex justify-between">
            <span>Size</span>
            <span className="font-medium" style={{ color: 'var(--foreground)' }}>{formatBytes(item.file_size)}</span>
          </div>
          {item.width && item.height && (
            <div className="flex justify-between">
              <span>Dimensions</span>
              <span className="font-medium" style={{ color: 'var(--foreground)' }}>{item.width} × {item.height}px</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Uploaded</span>
            <span className="font-medium" style={{ color: 'var(--foreground)' }}>
              {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>
          {Array.isArray(item.used_in) && item.used_in.length > 0 && (
            <div>
              <span className="text-yellow-600 font-semibold">Used in {item.used_in.length} place(s)</span>
            </div>
          )}
        </div>

        {/* Alt text */}
        <div>
          <label style={{ marginBottom: '4px' }}>Alt Text (SEO)</label>
          <textarea
            rows={2}
            value={altText}
            onChange={e => setAltText(e.target.value)}
            placeholder="Describe the image..."
            style={{ fontSize: '12px' }}
          />
          <button onClick={saveAlt} disabled={saving}
            className="mt-1.5 px-3 py-1 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--primary)', color: 'white', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save Alt Text'}
          </button>
        </div>

        {/* URL copy */}
        <div>
          <label style={{ marginBottom: '4px' }}>Public URL</label>
          <div className="flex gap-1">
            <input value={item.public_url} readOnly style={{ fontSize: '10px', flex: 1 }} />
            <button
              onClick={() => { navigator.clipboard.writeText(item.public_url); }}
              className="px-2 py-1 rounded-lg text-xs font-semibold flex-shrink-0"
              style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
            >Copy</button>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition"
          style={{ border: '1px solid #fecaca' }}
        >
          {deleting ? 'Deleting...' : '🗑 Delete Image'}
        </button>
      </div>
    </div>
  )
}
