'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Save, Eye } from 'lucide-react'

export default function NotificationBarPage() {
  const supabase = createClient()
  const [form, setForm] = useState({ id: null, text: '', bg_color: '#1e40af', text_color: '#ffffff', is_scrolling: true, button_text: '', button_url: '', expiry_date: '', is_active: false })
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(true)

  useEffect(() => { loadBar() }, [])

  async function loadBar() {
    const { data } = await supabase.from('announcement_bar').select('*').limit(1).single()
    if (data) setForm(data)
  }

  async function save() {
    setSaving(true)
    const { error } = form.id
      ? await supabase.from('announcement_bar').update(form).eq('id', form.id)
      : await supabase.from('announcement_bar').insert(form)
    if (error) toast.error(error.message)
    else { toast.success('Notification bar saved! Live on website instantly.'); loadBar() }
    setSaving(false)
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Website Notification Bar</h1>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Create a top announcement bar for your website</p>
      </div>

      {/* Live Preview */}
      {preview && (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs px-3 py-1.5 font-semibold" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>PREVIEW</p>
          <div className="flex items-center justify-center gap-3 px-4 py-2.5" style={{ background: form.bg_color }}>
            <p className="text-sm font-medium" style={{ color: form.text_color }}>{form.text || '🔥 Your announcement text here...'}</p>
            {form.button_text && (
              <a href={form.button_url} className="px-3 py-1 rounded-full text-xs font-bold border" style={{ borderColor: form.text_color, color: form.text_color }}>{form.button_text}</a>
            )}
          </div>
        </div>
      )}

      <div className="card space-y-4">
        <div><label>Announcement Text *</label><input value={form.text} onChange={e => set('text', e.target.value)} placeholder="🔥 Limited Seats! Ayodhya Tour — Book Now" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label>Background Color</label><input type="color" value={form.bg_color} onChange={e => set('bg_color', e.target.value)} /></div>
          <div><label>Text Color</label><input type="color" value={form.text_color} onChange={e => set('text_color', e.target.value)} /></div>
          <div><label>Button Text (optional)</label><input value={form.button_text} onChange={e => set('button_text', e.target.value)} placeholder="Book Now" /></div>
          <div><label>Button URL</label><input value={form.button_url} onChange={e => set('button_url', e.target.value)} placeholder="https://saanvitravel.com" /></div>
          <div><label>Expiry Date</label><input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} /></div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer" style={{ margin: 0 }}>
            <input type="checkbox" checked={form.is_scrolling} onChange={e => set('is_scrolling', e.target.checked)} style={{ width: '16px' }} />
            <span className="text-sm" style={{ color: 'var(--foreground)' }}>Scrolling Text</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer" style={{ margin: 0 }}>
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width: '16px' }} />
            <span className="text-sm font-semibold" style={{ color: form.is_active ? '#059669' : 'var(--muted-foreground)' }}>
              {form.is_active ? '✅ Active (Showing on website)' : '⭕ Inactive (Hidden)'}
            </span>
          </label>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : <><Save size={15} /> Save & Publish</>}
        </button>
      </div>
    </div>
  )
}
