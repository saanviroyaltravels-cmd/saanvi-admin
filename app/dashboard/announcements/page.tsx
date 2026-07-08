'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Save, Plus, Megaphone, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

const emptyAnn = { title: '', body: '', type: 'info', is_active: true, expiry_date: '' }
const types = [{ value: 'info', label: '📢 Info', color: '#3b82f6' }, { value: 'success', label: '✅ Success', color: '#059669' }, { value: 'warning', label: '⚠️ Warning', color: '#f59e0b' }, { value: 'urgent', label: '🚨 Urgent', color: '#dc2626' }]

export default function AnnouncementsPage() {
  const supabase = createClient()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyAnn)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setAnnouncements(data || [])
  }

  async function save() {
    setSaving(true)
    const { error } = editing?.id
      ? await supabase.from('announcements').update(form).eq('id', editing.id)
      : await supabase.from('announcements').insert(form)
    if (error) toast.error(error.message)
    else { toast.success('Announcement saved!'); setEditing(null); setForm(emptyAnn); load() }
    setSaving(false)
  }

  async function toggle(a: any) {
    await supabase.from('announcements').update({ is_active: !a.is_active }).eq('id', a.id); load()
  }

  async function del(id: string) {
    if (!confirm('Delete?')) return
    await supabase.from('announcements').delete().eq('id', id); load(); toast.success('Deleted')
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Announcements</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Website announcements for customers</p>
        </div>
        <button onClick={() => { setEditing({}); setForm(emptyAnn) }} className="btn-primary"><Plus size={16} /> New</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {editing !== null && (
          <div className="card space-y-4">
            <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>{editing?.id ? 'Edit' : 'Create'} Announcement</h2>
            <div><label>Title *</label><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Booking Open for Varanasi!" /></div>
            <div><label>Message</label><textarea rows={3} value={form.body} onChange={e => set('body', e.target.value)} placeholder="Details of announcement..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label>Type</label>
                <select value={form.type} onChange={e => set('type', e.target.value)}>
                  {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><label>Expiry Date</label><input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} /></div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer" style={{ margin: 0 }}>
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width: '16px' }} />
              <span className="text-sm" style={{ color: 'var(--foreground)' }}>Active (show on website)</span>
            </label>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : <><Save size={14} /> Save</>}</button>
              <button onClick={() => { setEditing(null); setForm(emptyAnn) }} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}

        <div className={editing !== null ? '' : 'lg:col-span-2'}>
          <div className="space-y-3">
            {announcements.map(a => {
              const typeInfo = types.find(t => t.value === a.type) || types[0]
              return (
                <div key={a.id} className="card flex items-center gap-3" style={{ padding: '1rem', borderLeft: `3px solid ${typeInfo.color}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{typeInfo.label}</span>
                      <span className={`badge ${a.is_active ? 'badge-green' : 'badge-gray'}`}>{a.is_active ? 'Active' : 'Off'}</span>
                    </div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{a.title}</p>
                    {a.body && <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{a.body}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditing(a); setForm(a) }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Megaphone size={14} /></button>
                    <button onClick={() => toggle(a)} className="p-1.5 rounded-lg hover:bg-slate-100" style={{ color: 'var(--muted-foreground)' }}>{a.is_active ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}</button>
                    <button onClick={() => del(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })}
            {!announcements.length && editing === null && <div className="card text-center py-12" style={{ color: 'var(--muted-foreground)' }}>No announcements yet</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
