'use client'
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Upload, Search, Filter, Grid3x3, List, Trash2, Copy,
  Image as ImageIcon, HardDrive, Layers, RefreshCw, X,
  ChevronDown, SlidersHorizontal, Info
} from 'lucide-react'
import { MediaGrid, MediaItem } from '@/components/MediaLibrary/MediaGrid'
import { MediaUploader } from '@/components/MediaLibrary/MediaUploader'
import type { MediaCategory } from '@/components/MediaLibrary/MediaUploader'

const PAGE_SIZE = 48

const CATEGORIES = [
  { value: 'all', label: 'All' },
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function MediaLibraryContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  // Data
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalSize, setTotalSize] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Filters — initialize from URL params (e.g. ?category=gallery from gallery redirect)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(searchParams.get('category') || 'all')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')

  // UI state
  const [selected, setSelected] = useState<string[]>([])
  const [selectedUrls, setSelectedUrls] = useState<string[]>([])
  const [details, setDetails] = useState<MediaItem | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>('general')
  const [refreshKey, setRefreshKey] = useState(0)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── Load data ──────────────────────────────────────────────────────────────
  async function loadMedia(pageNum: number, replace = false) {
    setLoading(true)
    let q = supabase.from('media').select('*', { count: 'exact' })
    if (category !== 'all') q = q.eq('category', category)
    if (search) q = q.ilike('file_name', `%${search}%`)
    q = q.order('created_at', { ascending: sort === 'oldest' })
    q = q.range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1)

    const { data, count } = await q
    const rows = (data || []) as MediaItem[]
    setItems(prev => replace ? rows : [...prev, ...rows])
    setTotal(count || 0)
    setHasMore((pageNum + 1) * PAGE_SIZE < (count || 0))
    setLoading(false)
  }

  async function loadStats() {
    const { data } = await supabase.from('media').select('file_size')
    const size = (data || []).reduce((acc: number, r: any) => acc + (r.file_size || 0), 0)
    setTotalSize(size)
  }

  useEffect(() => {
    setPage(0); setItems([]); setSelected([]); setSelectedUrls([])
    loadMedia(0, true)
    loadStats()
  }, [category, sort, refreshKey])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(0); setItems([])
      loadMedia(0, true)
    }, 350)
  }, [search])

  function loadMore() {
    const next = page + 1
    setPage(next)
    loadMedia(next)
  }

  function refresh() {
    setRefreshKey(k => k + 1)
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  function handleSelect(id: string, url: string) {
    setSelected(prev => [...prev, id])
    setSelectedUrls(prev => [...prev, url])
  }
  function handleDeselect(id: string) {
    const idx = selected.indexOf(id)
    setSelected(prev => prev.filter(s => s !== id))
    setSelectedUrls(prev => prev.filter((_, i) => i !== idx))
  }
  function clearSelection() { setSelected([]); setSelectedUrls([]) }

  async function deleteSelected() {
    if (!confirm(`Delete ${selected.length} image(s)? This cannot be undone.`)) return
    const toDelete = items.filter(i => selected.includes(i.id))
    const paths = toDelete.map(i => i.storage_path)
    await supabase.storage.from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'saanvi-media').remove(paths)
    for (const id of selected) {
      await supabase.from('media').delete().eq('id', id)
    }
    toast.success(`${selected.length} image(s) deleted`)
    clearSelection()
    refresh()
  }

  function handleDelete(item: MediaItem) {
    setItems(prev => prev.filter(i => i.id !== item.id))
    setTotal(t => t - 1)
    if (details?.id === item.id) setDetails(null)
  }

  function handleUploaded() {
    setShowUpload(false)
    refresh()
    toast.success('Image uploaded successfully!')
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const categoryStats = CATEGORIES.filter(c => c.value !== 'all').map(c => ({
    ...c,
    count: items.filter(i => i.category === c.value).length,
  })).filter(c => c.count > 0)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 65px)', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-1 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>📁 Media Library</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {total.toLocaleString()} images · {formatBytes(totalSize)} total
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={refresh} className="btn-ghost" title="Refresh">
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setShowUpload(v => !v)}
              className="btn-primary"
            >
              <Upload size={15} />
              {showUpload ? 'Hide Upload' : 'Upload Images'}
            </button>
          </div>
        </div>

        {/* ── Upload Panel ── */}
        {showUpload && (
          <div className="mt-4 card space-y-3" style={{ maxWidth: '600px' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Upload New Images</h3>
              <button onClick={() => setShowUpload(false)} style={{ color: 'var(--muted-foreground)' }}>
                <X size={16} />
              </button>
            </div>
            <div>
              <label>Category</label>
              <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value as MediaCategory)}>
                {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <MediaUploader
              category={uploadCategory}
              multiple
              onUploaded={() => handleUploaded()}
              onMultiUploaded={() => handleUploaded()}
            />
          </div>
        )}

        {/* ── Selection toolbar ── */}
        {selected.length > 0 && (
          <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', border: '1px solid var(--primary)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
              {selected.length} selected
            </span>
            <button onClick={() => { navigator.clipboard.writeText(selectedUrls[0] || ''); toast.success('URL copied!') }}
              className="btn-ghost" style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}>
              <Copy size={12} /> Copy URL
            </button>
            <button onClick={deleteSelected}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition flex items-center gap-1.5">
              <Trash2 size={12} /> Delete {selected.length}
            </button>
            <button onClick={clearSelection} className="ml-auto" style={{ color: 'var(--muted-foreground)' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── Filters bar ── */}
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--muted-foreground)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name..."
              style={{ paddingLeft: '2rem', height: '38px', fontSize: '13px' }}
            />
          </div>

          {/* Sort */}
          <select value={sort} onChange={e => setSort(e.target.value as any)}
            style={{ width: 'auto', height: '38px', fontSize: '13px' }}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {/* ── Category pills ── */}
        <div className="mt-3 flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition"
              style={{
                background: category === c.value ? 'var(--primary)' : 'var(--muted)',
                color: category === c.value ? 'white' : 'var(--muted-foreground)',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          <MediaGrid
            items={items}
            loading={loading && items.length === 0}
            selectable
            multiSelect
            selected={selected}
            onSelect={handleSelect}
            onDeselect={handleDeselect}
            onDelete={handleDelete}
            onDetails={setDetails}
            skeletonCount={24}
          />

          {/* Load more / empty */}
          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24"
              style={{ color: 'var(--muted-foreground)' }}>
              <ImageIcon size={40} className="mb-3 opacity-30" />
              <p className="font-semibold" style={{ color: 'var(--foreground)' }}>No images found</p>
              <p className="text-sm mt-1">
                {search || category !== 'all' ? 'Try adjusting your filters' : 'Upload your first image to get started'}
              </p>
              {!search && category === 'all' && (
                <button onClick={() => setShowUpload(true)} className="btn-primary mt-4">
                  <Upload size={15} /> Upload Images
                </button>
              )}
            </div>
          )}

          {hasMore && !loading && (
            <button
              onClick={loadMore}
              className="mt-4 w-full py-3 rounded-xl text-sm font-semibold transition"
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              Load more ({total - items.length} remaining)
            </button>
          )}
          {loading && items.length > 0 && (
            <p className="text-center py-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading...</p>
          )}
        </div>

        {/* Details panel */}
        {details && (
          <div
            className="w-72 flex-shrink-0 border rounded-2xl overflow-y-auto"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <ImageDetailsPanel
              item={details}
              onClose={() => setDetails(null)}
              onDeleted={() => { handleDelete(details); setDetails(null) }}
              onUpdated={(updated) => {
                setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))
                setDetails(updated)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function MediaLibraryPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" /></div>}>
      <MediaLibraryContent />
    </Suspense>
  )
}

// ─── Details Panel (standalone for page use) ──────────────────────────────────
function ImageDetailsPanel({
  item,
  onClose,
  onDeleted,
  onUpdated,
}: {
  item: MediaItem
  onClose: () => void
  onDeleted: () => void
  onUpdated: (updated: MediaItem) => void
}) {
  const supabase = createClient()
  const [altText, setAltText] = useState(item.alt_text || '')
  const [fileName, setFileName] = useState(item.file_name)
  const [editName, setEditName] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function formatBytes(b: number | null) {
    if (!b) return '—'
    return b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  async function saveMeta() {
    setSaving(true)
    const { data } = await supabase.from('media')
      .update({ alt_text: altText, file_name: fileName })
      .eq('id', item.id)
      .select()
      .single()
    if (data) onUpdated(data as MediaItem)
    setSaving(false)
    setEditName(false)
    toast.success('Saved!')
  }

  async function handleDelete() {
    const usedIn = Array.isArray(item.used_in) ? item.used_in : []
    const msg = usedIn.length > 0
      ? `This image is used in ${usedIn.length} place(s).\nDeleting will break those pages. Continue?`
      : 'Delete this image permanently?'
    if (!confirm(msg)) return
    setDeleting(true)
    await supabase.storage.from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'saanvi-media').remove([item.storage_path])
    await supabase.from('media').delete().eq('id', item.id)
    toast.success('Image deleted')
    onDeleted()
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>Image Details</p>
        <button onClick={onClose} style={{ color: 'var(--muted-foreground)' }}><X size={14} /></button>
      </div>

      {/* Preview */}
      <img src={item.public_url} alt={item.file_name}
        className="w-full rounded-xl object-cover" style={{ maxHeight: '180px' }} />

      {/* File name (editable) */}
      <div>
        <label style={{ marginBottom: '4px' }}>File Name</label>
        {editName ? (
          <input value={fileName} onChange={e => setFileName(e.target.value)}
            style={{ fontSize: '12px' }} autoFocus />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs flex-1 truncate font-medium" style={{ color: 'var(--foreground)' }}>
              {item.file_name}
            </span>
            <button onClick={() => setEditName(true)}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
              Rename
            </button>
          </div>
        )}
      </div>

      {/* Meta info */}
      <div className="space-y-2 text-xs rounded-xl p-3" style={{ background: 'var(--muted)' }}>
        {[
          ['Category', <span className="capitalize">{item.category}</span>],
          ['Size', formatBytes(item.file_size)],
          ['Dimensions', item.width && item.height ? `${item.width}×${item.height}px` : '—'],
          ['Type', item.mime_type || 'image/webp'],
          ['Uploaded', new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })],
        ].map(([label, value]) => (
          <div key={label as string} className="flex justify-between items-center">
            <span style={{ color: 'var(--muted-foreground)' }}>{label}</span>
            <span className="font-medium" style={{ color: 'var(--foreground)' }}>{value}</span>
          </div>
        ))}
        {Array.isArray(item.used_in) && item.used_in.length > 0 && (
          <div className="pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-yellow-600 font-semibold text-xs">
              ⚠️ Used in {item.used_in.length} place(s)
            </span>
          </div>
        )}
      </div>

      {/* Alt text */}
      <div>
        <label style={{ marginBottom: '4px' }}>Alt Text (SEO)</label>
        <textarea rows={2} value={altText} onChange={e => setAltText(e.target.value)}
          placeholder="Describe the image..." style={{ fontSize: '12px' }} />
      </div>

      {/* Save */}
      <button onClick={saveMeta} disabled={saving} className="btn-primary w-full"
        style={{ justifyContent: 'center' }}>
        {saving ? 'Saving...' : '💾 Save Changes'}
      </button>

      {/* URL */}
      <div>
        <label style={{ marginBottom: '4px' }}>Public URL</label>
        <div className="flex gap-1.5">
          <input value={item.public_url} readOnly style={{ fontSize: '10px', flex: 1 }} />
          <button
            onClick={() => { navigator.clipboard.writeText(item.public_url); toast.success('Copied!') }}
            className="px-2 py-1 rounded-lg text-xs font-semibold flex-shrink-0 flex items-center gap-1"
            style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
            <Copy size={11} /> Copy
          </button>
        </div>
      </div>

      {/* Delete */}
      <button onClick={handleDelete} disabled={deleting}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition flex items-center justify-center gap-2"
        style={{ border: '1px solid #fca5a5' }}>
        <Trash2 size={14} />
        {deleting ? 'Deleting...' : 'Delete Image'}
      </button>
    </div>
  )
}
