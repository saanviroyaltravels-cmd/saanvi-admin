'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const emptyOffer = { title: '', description: '', image: '', button_text: 'Book Now', button_link: '', start_date: '', end_date: '', priority: 1, is_active: true }

export default function OffersPage() {
  const supabase = createClient()
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyOffer)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadOffers() }, [])

  async function loadOffers() {
    const { data } = await supabase.from('offers').select('*').order('priority', { ascending: true })
    setOffers(data || [])
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const payload = { ...form, priority: Number(form.priority) }
    const { error } = editing?.id
      ? await supabase.from('offers').update(payload).eq('id', editing.id)
      : await supabase.from('offers').insert(payload)
    if (error) toast.error(error.message)
    else { toast.success(editing?.id ? 'Offer updated' : 'Offer created'); setEditing(null); setForm(emptyOffer); loadOffers() }
    setSaving(false)
  }

  async function deleteOffer(id: string) {
    if (!confirm('Delete this offer?')) return
    await supabase.from('offers').delete().eq('id', id)
    toast.success('Offer deleted'); loadOffers()
  }

  async function toggleActive(offer: any) {
    await supabase.from('offers').update({ is_active: !offer.is_active }).eq('id', offer.id)
    toast.success(offer.is_active ? 'Offer deactivated' : 'Offer activated'); loadOffers()
  }

  const startEdit = (offer: any) => { setEditing(offer); setForm(offer) }
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Offer Management</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Create and manage promotional offers</p>
        </div>
        <button onClick={() => { setEditing({}); setForm(emptyOffer) }} className="btn-primary"><Plus size={16} /> New Offer</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Form */}
        {editing !== null && (
          <div className="card space-y-4">
            <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>{editing?.id ? 'Edit Offer' : 'Create Offer'}</h2>
            <div><label>Offer Title *</label><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="🔥 Ayodhya Special Offer" /></div>
            <div><label>Description</label><textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Limited time offer..." /></div>
            <div><label>Image URL</label><input value={form.image} onChange={e => set('image', e.target.value)} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label>Button Text</label><input value={form.button_text} onChange={e => set('button_text', e.target.value)} placeholder="Book Now" /></div>
              <div><label>Button Link</label><input value={form.button_link} onChange={e => set('button_link', e.target.value)} placeholder="/packages" /></div>
              <div><label>Start Date</label><input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
              <div><label>End Date</label><input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
              <div><label>Priority</label><input type="number" min="1" value={form.priority} onChange={e => set('priority', e.target.value)} /></div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer" style={{ margin: 0 }}>
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width: '18px' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Active (visible on website)</span>
            </label>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Offer'}</button>
              <button onClick={() => { setEditing(null); setForm(emptyOffer) }} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}

        {/* Offers List */}
        <div className={editing !== null ? '' : 'lg:col-span-2'}>
          <div className="space-y-3">
            {loading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" /></div> :
              offers.map(offer => (
                <div key={offer.id} className="card flex items-center gap-4" style={{ padding: '1rem' }}>
                  {offer.image && <img src={offer.image} alt="" className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{offer.title}</p>
                      <span className={`badge ${offer.is_active ? 'badge-green' : 'badge-gray'}`}>{offer.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{offer.description}</p>
                    {offer.end_date && <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Ends: {formatDate(offer.end_date)}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(offer)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Edit size={14} /></button>
                    <button onClick={() => toggleActive(offer)} className="p-1.5 rounded-lg hover:bg-slate-100" style={{ color: 'var(--muted-foreground)' }}>
                      {offer.is_active ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}
                    </button>
                    <button onClick={() => deleteOffer(offer.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            {!loading && !offers.length && <div className="card text-center py-12" style={{ color: 'var(--muted-foreground)' }}>No offers yet. Create your first offer!</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
