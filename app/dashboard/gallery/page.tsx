'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Upload, Trash2, Copy, Image as ImageIcon } from 'lucide-react'

const CATEGORIES = ['banner', 'package', 'offer', 'gallery']

export default function GalleryPage() {
  const supabase = createClient()
  const [images, setImages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('gallery')

  useEffect(() => { loadImages() }, [category])

  async function loadImages() {
    setLoading(true)
    const { data } = await supabase.from('gallery').select('*').eq('category', category).order('created_at', { ascending: false })
    setImages(data || [])
    setLoading(false)
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)

    const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'saanvi-media'
    const ext = file.name.split('.').pop()
    const path = `${category}/${Date.now()}.${ext}`
    
    const { error: upErr } = await supabase.storage.from(bucketName).upload(path, file, { upsert: true })
    if (upErr) { 
      if (upErr.message.includes('Bucket not found') || upErr.message.includes('not found')) {
        toast.error(`Storage Bucket '${bucketName}' not found. Please run the SQL migration to create it.`)
      } else {
        toast.error('Upload failed: ' + upErr.message)
      }
      setUploading(false)
      return 
    }
    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(path)
    await supabase.from('gallery').insert({ url: publicUrl, category, name: file.name, size: file.size })
    toast.success('Image uploaded!'); setUploading(false); loadImages()
  }

  async function deleteImage(img: any) {
    if (!confirm('Delete this image?')) return
    await supabase.from('gallery').delete().eq('id', img.id)
    toast.success('Deleted'); loadImages()
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url); toast.success('URL copied!')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Image Gallery</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Upload and manage website images</p>
        </div>
        <label className="btn-primary cursor-pointer">
          {uploading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" /> : <Upload size={15} />}
          {uploading ? 'Uploading...' : 'Upload Image'}
          <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={uploading} />
        </label>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition"
            style={{ background: category === c ? 'var(--primary)' : 'var(--muted)', color: category === c ? 'white' : 'var(--muted-foreground)' }}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map(img => (
            <div key={img.id} className="group relative rounded-xl overflow-hidden border aspect-square" style={{ borderColor: 'var(--border)' }}>
              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition" style={{ background: 'rgba(0,0,0,0.5)' }}>
                <button onClick={() => copyUrl(img.url)} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white" title="Copy URL"><Copy size={14} /></button>
                <button onClick={() => deleteImage(img)} className="p-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white" title="Delete"><Trash2 size={14} /></button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1" style={{ background: 'rgba(0,0,0,0.6)' }}>
                <p className="text-white text-xs truncate">{img.name}</p>
              </div>
            </div>
          ))}
          {!images.length && (
            <div className="col-span-full flex flex-col items-center justify-center py-16" style={{ color: 'var(--muted-foreground)' }}>
              <ImageIcon size={40} className="mb-3 opacity-30" />
              <p>No images in {category}. Upload your first one!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
