'use client'
import { useState } from 'react'
import { Images, X, Plus } from 'lucide-react'
import { MediaPicker } from './MediaPicker'
import type { MediaCategory } from './MediaUploader'

// ─── Single Image Picker Field ─────────────────────────────────────────────────
interface SinglePickerProps {
  value: string
  onChange: (url: string) => void
  label?: string
  category?: MediaCategory
  placeholder?: string
}

export function MediaPickerField({
  value,
  onChange,
  label = 'Image',
  category = 'general',
  placeholder,
}: SinglePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-2">
      {label && <label>{label}</label>}

      {value ? (
        <div className="relative group inline-block w-full">
          <img
            src={value}
            alt="Selected"
            className="w-full max-h-48 object-cover rounded-xl border"
            style={{ borderColor: 'var(--border)' }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition rounded-xl"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="px-3 py-1.5 rounded-xl text-sm font-semibold text-white transition hover:bg-white/20"
              style={{ border: '1px solid rgba(255,255,255,0.4)' }}
            >
              Change Image
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
              style={{ background: 'rgba(220,38,38,0.8)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 transition hover:border-blue-400"
          style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--card)' }}>
            <Images size={22} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
              Select from <span style={{ color: 'var(--primary)' }}>Media Library</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {placeholder || 'Browse uploaded images or upload a new one'}
            </p>
          </div>
        </button>
      )}

      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onSelect={urls => { if (urls[0]) onChange(urls[0]) }}
        multiSelect={false}
        defaultCategory={category}
      />
    </div>
  )
}

// ─── Multi Image Picker Field ──────────────────────────────────────────────────
interface MultiPickerProps {
  value: string[]
  onChange: (urls: string[]) => void
  label?: string
  category?: MediaCategory
  maxImages?: number
}

export function MediaPickerMultiField({
  value = [],
  onChange,
  label = 'Gallery Images',
  category = 'general',
  maxImages = 20,
}: MultiPickerProps) {
  const [open, setOpen] = useState(false)

  function removeImage(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }

  function handleSelect(urls: string[]) {
    const existing = new Set(value)
    const newUrls = urls.filter(u => !existing.has(u))
    const combined = [...value, ...newUrls].slice(0, maxImages)
    onChange(combined)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label style={{ margin: 0 }}>{label}</label>
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {value.length}/{maxImages} images
        </span>
      </div>

      {/* Grid of selected images */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {value.map((url, idx) => (
            <div key={url + idx}
              className="group relative rounded-xl overflow-hidden border"
              style={{ aspectRatio: '1', borderColor: 'var(--border)' }}>
              <img src={url} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                style={{ background: 'rgba(0,0,0,0.5)' }}>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'rgba(220,38,38,0.9)' }}>
                  <X size={14} />
                </button>
              </div>
              <span className="absolute bottom-1 left-1 right-1 text-center text-white text-xs font-semibold px-1 rounded"
                style={{ background: 'rgba(0,0,0,0.5)' }}>{idx + 1}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add more button */}
      {value.length < maxImages && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full border-2 border-dashed rounded-xl p-5 flex items-center justify-center gap-3 transition hover:border-blue-400"
          style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--card)' }}>
            <Plus size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
              {value.length === 0 ? 'Select from ' : 'Add more from '}
              <span style={{ color: 'var(--primary)' }}>Media Library</span>
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Up to {maxImages - value.length} more image{maxImages - value.length !== 1 ? 's' : ''}
            </p>
          </div>
        </button>
      )}

      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
        multiSelect
        defaultCategory={category}
        title="Select Gallery Images"
      />
    </div>
  )
}
