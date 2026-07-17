'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { MediaPickerField } from '@/components/MediaLibrary'

const emptyOffer = { 
  title: '', 
  description: '', 
  image: '', 
  button_text: 'Book Now', 
  button_link: '', 
  start_date: '', 
  end_date: '', 
  priority: 1, 
  is_active: true,
  offer_price: '',
  original_price: '',
  package_id: '',
  offer_type: 'Special Offer'
}

export default function OffersPage() {
  const supabase = createClient()
  const [offers, setOffers] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyOffer)
  const [saving, setSaving] = useState(false)

  useEffect(() => { 
    loadOffers()
    loadPackages()
  }, [])

  async function loadOffers() {
    const { data } = await supabase.from('offers').select('*').order('priority', { ascending: true })
    setOffers(data || [])
    setLoading(false)
  }

  async function loadPackages() {
    const { data } = await supabase.from('packages').select('id, title, slug').order('title', { ascending: true })
    setPackages(data || [])
  }

  async function save() {
    if (!form.title) {
      toast.error('Offer Title is required')
      return
    }
    if (!form.package_id) {
      toast.error('Please select a Package.')
      return
    }
    setSaving(true)
    
    // Upload image if selected (now handled via Media Library — image URL set directly)
    const imageUrl = form.image

    const payload = { 
      ...form, 
      priority: Number(form.priority),
      offer_price: form.offer_price ? Number(form.offer_price) : null,
      original_price: form.original_price ? Number(form.original_price) : null,
      package_id: form.package_id || null,
      image: imageUrl
    }
    
    const { error } = editing?.id
      ? await supabase.from('offers').update(payload).eq('id', editing.id)
      : await supabase.from('offers').insert(payload)
      
    if (error) toast.error(error.message)
    else { 
      toast.success(editing?.id ? 'Offer updated' : 'Offer created')
      setEditing(null)
      setForm(emptyOffer)
      loadOffers() 
    }
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

  const startEdit = (offer: any) => { 
    setEditing(offer)
    setForm({
      ...emptyOffer,
      ...offer,
      offer_price: offer.offer_price || '',
      original_price: offer.original_price || '',
      package_id: offer.package_id || '',
      offer_type: offer.offer_type || 'Special Offer'
    })
  }
  
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Offer Management</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Create and manage promotional offers</p>
        </div>
        <button onClick={() => { setEditing({}); setForm(emptyOffer); }} className="btn-primary"><Plus size={16} /> New Offer</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Form */}
        {editing !== null && (
          <div className="card space-y-4">
            <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>{editing?.id ? 'Edit Offer' : 'Create Offer'}</h2>
            
            <div><label>Offer Title *</label><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="🔥 Ayodhya Special Offer" /></div>
            <div><label>Description</label><textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Limited time offer..." /></div>
                       {/* Poster Image via Media Library */}
            <div>
              <MediaPickerField
                value={form.image}
                onChange={url => set('image', url)}
                label="Poster Image"
                category="offers"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label>Offer Price (₹)</label><input type="number" value={form.offer_price} onChange={e => set('offer_price', e.target.value)} placeholder="e.g. 5000" /></div>
              <div><label>Original Price (₹)</label><input type="number" value={form.original_price} onChange={e => set('original_price', e.target.value)} placeholder="e.g. 6000" /></div>
              
              <div>
                <label>Offer Type</label>
                <select value={form.offer_type} onChange={e => set('offer_type', e.target.value)} className="w-full h-10 px-3 rounded-md border text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}>
                  <option value="Special Offer">Special Offer</option>
                  <option value="Festival Offer">Festival Offer</option>
                  <option value="Weekend Offer">Weekend Offer</option>
                  <option value="Limited Time">Limited Time</option>
                </select>
              </div>
              
              <div>
                <label>Linked Package (Required)</label>
                <select value={form.package_id} onChange={e => set('package_id', e.target.value)} className="w-full h-10 px-3 rounded-md border text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}>
                  <option value="">-- Select a Package --</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div><label>Button Text</label><input value={form.button_text} onChange={e => set('button_text', e.target.value)} placeholder="Book Now" /></div>
              <div><label>Custom Link (if no package)</label><input value={form.button_link} onChange={e => set('button_link', e.target.value)} placeholder="/contact" /></div>
              
              <div><label>Start Date</label><input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
              <div><label>End Date</label><input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
              
              <div><label>Priority (1 = Highest)</label><input type="number" min="1" value={form.priority} onChange={e => set('priority', e.target.value)} /></div>
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer" style={{ margin: 0, marginTop: '8px' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width: '18px' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Active (visible on website)</span>
            </label>
            
            <div className="flex gap-2 pt-2">
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Offer'}</button>
              <button onClick={() => { setEditing(null); setForm(emptyOffer); }} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}

        {/* Offers List */}
        <div className={editing !== null ? '' : 'lg:col-span-2'}>
          <div className="space-y-3">
            {loading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" /></div> :
              offers.map(offer => (
                <div key={offer.id} className="card flex flex-col sm:flex-row gap-4" style={{ padding: '1rem' }}>
                  {offer.image ? (
                    <img src={offer.image} alt="" className="w-full sm:w-24 h-32 sm:h-20 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-full sm:w-24 h-32 sm:h-20 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                      <span className="text-sm">No Image</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-bold text-base leading-none" style={{ color: 'var(--foreground)' }}>{offer.title}</p>
                        {offer.offer_type && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase">{offer.offer_type}</span>}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${offer.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{offer.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <p className="text-xs line-clamp-1" style={{ color: 'var(--muted-foreground)' }}>{offer.description}</p>
                      
                      <div className="flex items-center gap-3 mt-2">
                        {offer.offer_price && <p className="text-sm font-bold text-blue-600">₹{offer.offer_price} {offer.original_price && <span className="text-xs text-slate-400 line-through font-normal">₹{offer.original_price}</span>}</p>}
                        {offer.end_date && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Ends: {formatDate(offer.end_date)}</p>}
                        <p className="text-xs font-semibold bg-slate-100 px-1.5 py-0.5 rounded">Priority: {offer.priority}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end gap-1 mt-3 sm:mt-0">
                      <button onClick={() => startEdit(offer)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-blue-50 text-blue-600 font-medium">Edit</button>
                      <button onClick={() => toggleActive(offer)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-slate-100 font-medium" style={{ color: 'var(--muted-foreground)' }}>
                        {offer.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => deleteOffer(offer.id)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-red-50 text-red-500 font-medium">Delete</button>
                    </div>
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
