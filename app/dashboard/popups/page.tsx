'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'

const emptyPopup = { title: '', description: '', image: '', button_text: 'Book Now', button_url: '', bg_color: '#ffffff', text_color: '#0f172a', size: 'medium', animation: 'fade', delay_seconds: 2, show_once: true, show_on_home: true, show_on_all: false, expiry_date: '', is_active: true }

export default function PopupsPage() {
  const supabase = createClient()
  const [popups, setPopups] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyPopup)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)

  useEffect(() => { loadPopups() }, [])

  async function loadPopups() {
    const { data } = await supabase.from('popup_notifications').select('*').order('created_at', { ascending: false })
    setPopups(data || [])
  }

  async function save() {
    setSaving(true)
    const { error } = editing?.id
      ? await supabase.from('popup_notifications').update(form).eq('id', editing.id)
      : await supabase.from('popup_notifications').insert(form)
    if (error) toast.error(error.message)
    else { toast.success('Popup saved!'); setEditing(null); setForm(emptyPopup); loadPopups() }
    setSaving(false)
  }

  async function deletePopup(id: string) {
    if (!confirm('Delete this popup?')) return
    await supabase.from('popup_notifications').delete().eq('id', id)
    toast.success('Deleted'); loadPopups()
  }

  async function togglePopup(popup: any) {
    await supabase.from('popup_notifications').update({ is_active: !popup.is_active }).eq('id', popup.id)
    loadPopups()
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Popup Builder</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Create website popups without coding</p>
        </div>
        <button onClick={() => { setEditing({}); setForm(emptyPopup) }} className="btn-primary"><Plus size={16} /> New Popup</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Form */}
        {editing !== null && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>{editing?.id ? 'Edit Popup' : 'Create Popup'}</h2>
              <button onClick={() => setPreview(!preview)} className="btn-ghost text-xs"><Eye size={14} /> Preview</button>
            </div>

            {/* Live Preview */}
            {preview && (
              <div className="relative rounded-xl overflow-hidden border" style={{ background: form.bg_color, borderColor: 'var(--border)', minHeight: '150px', padding: '20px' }}>
                {form.image && <img src={form.image} alt="" className="w-full h-28 object-cover rounded-lg mb-3" />}
                <p className="font-bold text-lg mb-1" style={{ color: form.text_color }}>{form.title || 'Popup Title'}</p>
                <p className="text-sm mb-3" style={{ color: form.text_color, opacity: 0.8 }}>{form.description || 'Popup description here...'}</p>
                {form.button_text && <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#1e40af' }}>{form.button_text}</button>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label>Title *</label><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Special Offer!" /></div>
              <div className="col-span-2"><label>Description</label><textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
              <div className="col-span-2"><label>Image URL</label><input value={form.image} onChange={e => set('image', e.target.value)} placeholder="https://..." /></div>
              <div><label>Button Text</label><input value={form.button_text} onChange={e => set('button_text', e.target.value)} /></div>
              <div><label>Button URL</label><input value={form.button_url} onChange={e => set('button_url', e.target.value)} /></div>
              <div><label>Background Color</label><input type="color" value={form.bg_color} onChange={e => set('bg_color', e.target.value)} /></div>
              <div><label>Text Color</label><input type="color" value={form.text_color} onChange={e => set('text_color', e.target.value)} /></div>
              <div><label>Size</label><select value={form.size} onChange={e => set('size', e.target.value)}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
              <div><label>Animation</label><select value={form.animation} onChange={e => set('animation', e.target.value)}><option value="fade">Fade</option><option value="slide">Slide</option><option value="zoom">Zoom</option></select></div>
              <div><label>Delay (seconds)</label><input type="number" min="0" value={form.delay_seconds} onChange={e => set('delay_seconds', Number(e.target.value))} /></div>
              <div><label>Expiry Date</label><input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} /></div>
            </div>
            <div className="flex flex-wrap gap-4">
              {[['show_once', 'Show Once Per Visit'], ['show_on_home', 'Show on Homepage'], ['show_on_all', 'Show on All Pages'], ['is_active', 'Active']].map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer" style={{ margin: 0 }}>
                  <input type="checkbox" checked={(form as any)[k]} onChange={e => set(k, e.target.checked)} style={{ width: '16px' }} />
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>{l}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Popup'}</button>
              <button onClick={() => { setEditing(null); setForm(emptyPopup) }} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}

        {/* List */}
        <div className={editing !== null ? '' : 'lg:col-span-2'}>
          <div className="space-y-3">
            {popups.map(p => (
              <div key={p.id} className="card flex items-center gap-3" style={{ padding: '1rem' }}>
                <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: p.bg_color || '#f1f5f9' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{p.title}</p>
                    <span className={`badge ${p.is_active ? 'badge-green' : 'badge-gray'}`}>{p.is_active ? 'Active' : 'Off'}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{p.animation} · {p.delay_seconds}s delay · {p.size}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(p); setForm(p) }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Edit size={14} /></button>
                  <button onClick={() => togglePopup(p)} className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-slate-100" style={{ color: 'var(--muted-foreground)' }}>{p.is_active ? 'Disable' : 'Enable'}</button>
                  <button onClick={() => deletePopup(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {!popups.length && editing === null && <div className="card text-center py-12" style={{ color: 'var(--muted-foreground)' }}>No popups yet. Create your first popup!</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
