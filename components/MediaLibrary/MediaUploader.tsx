'use client'
import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Loader2, CheckCircle, AlertCircle, CloudUpload } from 'lucide-react'
import { toast } from 'sonner'

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'saanvi-media'
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024 // 5MB

export type MediaCategory =
  | 'packages' | 'offers' | 'homepage' | 'banner'
  | 'vehicles' | 'destinations' | 'gallery' | 'logos'
  | 'testimonials' | 'general'

interface UploadProgress {
  name: string
  progress: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

interface MediaUploaderProps {
  category?: MediaCategory
  onUploaded?: (media: { id: string; url: string; name: string }) => void
  onMultiUploaded?: (medias: { id: string; url: string; name: string }[]) => void
  multiple?: boolean
  compact?: boolean
}

// ─── Image helpers ─────────────────────────────────────────────────────────────
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 0, height: 0 }) }
    img.src = url
  })
}

async function compressToWebP(file: File, maxWidth = 1600, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error('Compression failed')) },
        'image/webp', quality
      )
    }
    img.onerror = reject
    img.src = url
  })
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPG, PNG, WEBP allowed'
  if (file.size > MAX_BYTES) return 'Max 5MB per image'
  return null
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function MediaUploader({
  category = 'general',
  onUploaded,
  onMultiUploaded,
  multiple = false,
  compact = false,
}: MediaUploaderProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [progresses, setProgresses] = useState<UploadProgress[]>([])

  function setProgress(name: string, update: Partial<UploadProgress>) {
    setProgresses(prev =>
      prev.map(p => p.name === name ? { ...p, ...update } : p)
    )
  }

  async function uploadFile(file: File): Promise<{ id: string; url: string; name: string } | null> {
    const err = validateFile(file)
    if (err) { toast.error(err); return null }

    setProgress(file.name, { progress: 10 })
    try {
      // Get original dimensions before compression
      const dims = await getImageDimensions(file)

      setProgress(file.name, { progress: 25 })
      const compressed = await compressToWebP(file)
      const storagePath = `${category}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

      setProgress(file.name, { progress: 55 })
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, compressed, { contentType: 'image/webp', upsert: false })

      if (upErr) {
        if (upErr.message.includes('not found') || upErr.message.includes('Bucket')) {
          throw new Error(`Storage bucket '${BUCKET}' not found. Please run the SQL migration.`)
        }
        throw upErr
      }

      setProgress(file.name, { progress: 75 })
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

      // Save metadata to media table
      const { data: mediaRow, error: dbErr } = await supabase
        .from('media')
        .insert({
          file_name: file.name.replace(/\.[^.]+$/, '') || 'image',
          public_url: publicUrl,
          storage_path: storagePath,
          category,
          mime_type: 'image/webp',
          file_size: compressed.size,
          width: dims.width,
          height: dims.height,
          alt_text: '',
        })
        .select('id, public_url, file_name')
        .single()

      if (dbErr) {
        // Upload succeeded but DB failed — still return URL
        console.warn('Media DB insert failed:', dbErr.message)
        setProgress(file.name, { progress: 100, status: 'done' })
        return { id: '', url: publicUrl, name: file.name }
      }

      setProgress(file.name, { progress: 100, status: 'done' })
      return { id: mediaRow.id, url: mediaRow.public_url, name: mediaRow.file_name }
    } catch (e: any) {
      setProgress(file.name, { progress: 0, status: 'error', error: e.message })
      toast.error(e.message)
      return null
    }
  }

  async function handleFiles(files: File[]) {
    const initial: UploadProgress[] = files.map(f => ({ name: f.name, progress: 0, status: 'uploading' }))
    setProgresses(prev => [...prev, ...initial])

    const results: { id: string; url: string; name: string }[] = []
    for (const file of files) {
      const result = await uploadFile(file)
      if (result) results.push(result)
    }

    if (results.length === 1 && onUploaded) onUploaded(results[0])
    if (results.length > 0 && onMultiUploaded) onMultiUploaded(results)
    if (results.length > 0) toast.success(`${results.length} image${results.length > 1 ? 's' : ''} uploaded!`)

    setTimeout(() => setProgresses([]), 2500)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }, [category])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-xl cursor-pointer transition-all"
        style={{
          borderColor: dragging ? 'var(--primary)' : 'var(--border)',
          background: dragging ? 'color-mix(in srgb, var(--primary) 5%, transparent)' : 'var(--muted)',
          padding: compact ? '1rem' : '2rem',
        }}
      >
        <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--card)' }}>
            <CloudUpload size={20} style={{ color: 'var(--primary)' }} />
          </div>
          {!compact && (
            <>
              <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                Drop {multiple ? 'images' : 'an image'} here or{' '}
                <span style={{ color: 'var(--primary)' }}>browse</span>
              </p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                JPG, PNG, WEBP · Max 5MB · Auto-compressed to WebP
              </p>
            </>
          )}
          {compact && (
            <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Upload {multiple ? 'images' : 'image'}
            </p>
          )}
        </div>
      </div>

      {/* Progress bars */}
      {progresses.map(p => (
        <div key={p.name} className="rounded-xl p-3 border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <div className="flex items-center gap-2 mb-2">
            {p.status === 'uploading' && <Loader2 size={14} className="spinner" style={{ color: 'var(--primary)' }} />}
            {p.status === 'done' && <CheckCircle size={14} className="text-green-500" />}
            {p.status === 'error' && <AlertCircle size={14} className="text-red-500" />}
            <span className="text-xs truncate flex-1" style={{ color: 'var(--foreground)' }}>{p.name}</span>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{p.progress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{
              width: `${p.progress}%`,
              background: p.status === 'error' ? '#dc2626' : p.status === 'done' ? '#22c55e' : 'var(--primary)'
            }} />
          </div>
          {p.error && <p className="text-xs mt-1 text-red-500">{p.error}</p>}
        </div>
      ))}

      <input ref={inputRef} type="file" multiple={multiple}
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden" onChange={onFileChange} />
    </div>
  )
}
