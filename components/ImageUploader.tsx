'use client'
import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Image compression + resize using Canvas API ──────────────────────────────
async function compressImage(file: File, maxWidth = 1600, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
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

// ─── Validation ───────────────────────────────────────────────────────────────
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_MB = 5

function validateFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return 'Only JPG, PNG, WEBP allowed'
  if (file.size > MAX_MB * 1024 * 1024) return `Max ${MAX_MB}MB per image`
  return null
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface UploadedImage { url: string; preview: string; name: string }
interface UploadProgress { name: string; progress: number; status: 'uploading' | 'done' | 'error'; error?: string }

// ═════════════════════════════════════════════════════════════════════════════
// SINGLE IMAGE UPLOADER
// ═════════════════════════════════════════════════════════════════════════════
interface SingleUploaderProps {
  value: string
  onChange: (url: string) => void
  bucket?: string
  folder?: string
  label?: string
}

export function SingleImageUploader({
  value, onChange, bucket = 'package-images', folder = 'main', label = 'Main Image'
}: SingleUploaderProps) {
  const supabase = createClient()
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    const err = validateFile(file)
    if (err) { toast.error(err); return }

    setProgress({ name: file.name, progress: 10, status: 'uploading' })

    try {
      // Compress
      setProgress(p => ({ ...p!, progress: 25 }))
      const compressed = await compressImage(file)
      const ext = 'webp'
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      setProgress(p => ({ ...p!, progress: 60 }))
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, compressed, {
        contentType: 'image/webp', upsert: true
      })
      if (upErr) throw upErr

      setProgress(p => ({ ...p!, progress: 90 }))
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)

      onChange(publicUrl)
      setProgress({ name: file.name, progress: 100, status: 'done' })
      toast.success('Image uploaded!')
      setTimeout(() => setProgress(null), 2000)
    } catch (e: any) {
      setProgress({ name: file.name, progress: 0, status: 'error', error: e.message })
      toast.error('Upload failed: ' + e.message)
      setTimeout(() => setProgress(null), 3000)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  const removeImage = async () => {
    onChange('')
  }

  return (
    <div className="space-y-2">
      <label>{label}</label>

      {/* Preview */}
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="Preview" className="w-full max-h-48 object-cover rounded-xl border"
            style={{ borderColor: 'var(--border)' }} />
          <div className="absolute top-2 right-2 flex gap-1">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="px-2 py-1 rounded-lg text-xs font-semibold text-white"
              style={{ background: 'rgba(0,0,0,0.6)' }}>
              Replace
            </button>
            <button type="button" onClick={removeImage}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white"
              style={{ background: 'rgba(220,38,38,0.8)' }}>
              <X size={12} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all',
            dragging ? 'border-blue-500 bg-blue-50' : 'hover:border-blue-400 hover:bg-blue-50/50'
          )}
          style={{ borderColor: dragging ? '#3b82f6' : 'var(--border)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--muted)' }}>
            <ImageIcon size={22} style={{ color: 'var(--muted-foreground)' }} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
              Drop image here or <span className="text-blue-600">browse</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              JPG, PNG, WEBP · Max {MAX_MB}MB · Auto-compressed to 1600px
            </p>
          </div>
        </div>
      )}

      {/* Progress */}
      {progress && (
        <div className="rounded-xl p-3 border" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
          <div className="flex items-center gap-2 mb-2">
            {progress.status === 'uploading' && <Loader2 size={14} className="spinner text-blue-600" />}
            {progress.status === 'done' && <CheckCircle size={14} className="text-green-600" />}
            {progress.status === 'error' && <AlertCircle size={14} className="text-red-500" />}
            <span className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{progress.name}</span>
            <span className="ml-auto text-xs" style={{ color: 'var(--muted-foreground)' }}>{progress.progress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress.progress}%`,
                background: progress.status === 'error' ? '#dc2626' : progress.status === 'done' ? '#059669' : '#3b82f6'
              }} />
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={onFileChange} />
    </div>
  )
}


// ═════════════════════════════════════════════════════════════════════════════
// GALLERY IMAGE UPLOADER (multiple)
// ═════════════════════════════════════════════════════════════════════════════
interface GalleryUploaderProps {
  value: string[]
  onChange: (urls: string[]) => void
  bucket?: string
  folder?: string
  maxImages?: number
}

export function GalleryImageUploader({
  value = [], onChange, bucket = 'package-images', folder = 'gallery', maxImages = 10
}: GalleryUploaderProps) {
  const supabase = createClient()
  const [dragging, setDragging] = useState(false)
  const [progresses, setProgresses] = useState<UploadProgress[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function updateProgress(name: string, update: Partial<UploadProgress>) {
    setProgresses(prev => prev.map(p => p.name === name ? { ...p, ...update } : p))
  }

  async function uploadFiles(files: File[]) {
    const remaining = maxImages - value.length
    if (remaining <= 0) { toast.error(`Max ${maxImages} gallery images allowed`); return }

    const toUpload = Array.from(files).slice(0, remaining)
    const newProgresses: UploadProgress[] = toUpload.map(f => ({ name: f.name, progress: 0, status: 'uploading' }))
    setProgresses(prev => [...prev, ...newProgresses])

    const urls: string[] = []

    for (const file of toUpload) {
      const err = validateFile(file)
      if (err) {
        updateProgress(file.name, { status: 'error', error: err })
        toast.error(`${file.name}: ${err}`)
        continue
      }

      try {
        updateProgress(file.name, { progress: 20 })
        const compressed = await compressImage(file, 1200, 0.82)
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
        updateProgress(file.name, { progress: 60 })

        const { error: upErr } = await supabase.storage.from(bucket).upload(path, compressed, {
          contentType: 'image/webp', upsert: true
        })
        if (upErr) throw upErr

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
        urls.push(publicUrl)
        updateProgress(file.name, { progress: 100, status: 'done' })
      } catch (e: any) {
        updateProgress(file.name, { status: 'error', error: e.message })
        toast.error(`${file.name}: ${e.message}`)
      }
    }

    if (urls.length > 0) {
      onChange([...value, ...urls])
      toast.success(`${urls.length} image${urls.length > 1 ? 's' : ''} uploaded!`)
    }
    setTimeout(() => setProgresses([]), 2500)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    uploadFiles(Array.from(e.dataTransfer.files))
  }, [value])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) uploadFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const removeImage = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label style={{ margin: 0 }}>Gallery Images</label>
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {value.length}/{maxImages} images
        </span>
      </div>

      {/* Thumbnails */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {value.map((url, idx) => (
            <div key={url + idx} className="relative group aspect-square rounded-xl overflow-hidden border"
              style={{ borderColor: 'var(--border)' }}>
              <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                style={{ background: 'rgba(0,0,0,0.5)' }}>
                <button type="button" onClick={() => removeImage(idx)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'rgba(220,38,38,0.9)' }}>
                  <X size={14} />
                </button>
              </div>
              <div className="absolute bottom-1 left-1 right-1 text-center">
                <span className="text-white text-xs font-semibold px-1 rounded"
                  style={{ background: 'rgba(0,0,0,0.5)' }}>{idx + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      {value.length < maxImages && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all',
            dragging ? 'border-blue-500 bg-blue-50' : 'hover:border-blue-400 hover:bg-blue-50/50'
          )}
          style={{ borderColor: dragging ? '#3b82f6' : 'var(--border)' }}>
          <Upload size={20} style={{ color: 'var(--muted-foreground)' }} />
          <div className="text-center">
            <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
              Drop images or <span className="text-blue-600">browse</span>
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Up to {maxImages - value.length} more · JPG, PNG, WEBP · Max {MAX_MB}MB each
            </p>
          </div>
        </div>
      )}

      {/* Upload Progresses */}
      {progresses.length > 0 && (
        <div className="space-y-2">
          {progresses.map(p => (
            <div key={p.name} className="rounded-xl p-2.5 border" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                {p.status === 'uploading' && <Loader2 size={12} className="spinner text-blue-600" />}
                {p.status === 'done' && <CheckCircle size={12} className="text-green-600" />}
                {p.status === 'error' && <AlertCircle size={12} className="text-red-500" />}
                <span className="text-xs truncate flex-1" style={{ color: 'var(--foreground)' }}>{p.name}</span>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{p.progress}%</span>
              </div>
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${p.progress}%`,
                    background: p.status === 'error' ? '#dc2626' : p.status === 'done' ? '#059669' : '#3b82f6'
                  }} />
              </div>
              {p.error && <p className="text-xs mt-1 text-red-500">{p.error}</p>}
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden" onChange={onFileChange} />
    </div>
  )
}
