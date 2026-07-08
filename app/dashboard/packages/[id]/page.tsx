'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { SingleImageUploader, GalleryImageUploader } from '@/components/ImageUploader'

const VEHICLE_TYPES = ['Innova', 'Innova Crysta', 'Ertiga', 'Traveller', 'Bus', 'Sedan', 'SUV']
const DESTINATIONS = ['Ayodhya', 'Varanasi', 'Bodh Gaya', 'Prayagraj', 'Rajgir', 'Nalanda', 'Patna', 'Lucknow', 'Gorakhpur', 'Kathmandu', 'Ujjain', 'Shirdi']

export default function PackageFormPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const isNew = params.id === 'new'
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', dest: '', route: '', description: '', pickup_point: '',
    travel_date: '', return_date: '', duration: '', price: '',
    discount_price: '', seats: '', vehicle_type: 'Innova',
    hotel_included: false, meals_included: false,
    includes: '', excludes: '', image: '', gallery: [] as string[],
    is_active: true, featured: false, popular: false
  })

  useEffect(() => {
    if (!isNew) loadPackage()
  }, [])

  async function loadPackage() {
    setLoading(true)
    const { data } = await supabase.from('packages').select('*').eq('id', params.id).single()
    if (data) setForm({ ...data, includes: data.includes || '', excludes: data.excludes || '', image: data.image || '', gallery: Array.isArray(data.gallery) ? data.gallery : [] })
    setLoading(false)
  }

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      price: Number(form.price),
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      seats: form.seats ? Number(form.seats) : null,
      gallery: form.gallery,
    }
    const { error } = isNew
      ? await supabase.from('packages').insert(payload)
      : await supabase.from('packages').update(payload).eq('id', params.id)
    if (error) toast.error(error.message)
    else { toast.success(isNew ? 'Package created!' : 'Package updated!'); router.push('/dashboard/packages') }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" /></div>

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/packages" className="p-2 rounded-lg hover:bg-muted" style={{ color: 'var(--muted-foreground)' }}><ArrowLeft size={18} /></Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{isNew ? 'Add New Package' : 'Edit Package'}</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Fill in the details below</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Basic Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label>Package Name *</label><input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="Ayodhya Darshan Package" /></div>
            <div><label>Destination *</label>
              <select value={form.dest} onChange={e => set('dest', e.target.value)} required>
                <option value="">Select destination</option>
                {DESTINATIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div><label>Route</label><input value={form.route} onChange={e => set('route', e.target.value)} placeholder="Siwan → Ayodhya → Siwan" /></div>
            <div><label>Pickup Point</label><input value={form.pickup_point} onChange={e => set('pickup_point', e.target.value)} placeholder="Siwan Bus Stand" /></div>
            <div><label>Travel Date</label><input type="date" value={form.travel_date} onChange={e => set('travel_date', e.target.value)} /></div>
            <div><label>Return Date</label><input type="date" value={form.return_date} onChange={e => set('return_date', e.target.value)} /></div>
            <div><label>Duration</label><input value={form.duration} onChange={e => set('duration', e.target.value)} placeholder="2 Days 1 Night" /></div>
            <div><label>Seats Available</label><input type="number" value={form.seats} onChange={e => set('seats', e.target.value)} placeholder="20" /></div>
          </div>
          <div><label>Description</label><textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Package description..." /></div>
        </div>

        {/* Pricing */}
        <div className="card space-y-4">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Pricing</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div><label>Price (₹) *</label><input type="number" value={form.price} onChange={e => set('price', e.target.value)} required placeholder="2999" /></div>
            <div><label>Discount Price (₹)</label><input type="number" value={form.discount_price} onChange={e => set('discount_price', e.target.value)} placeholder="2499" /></div>
            <div><label>Vehicle Type</label>
              <select value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)}>
                {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Inclusions */}
        <div className="card space-y-4">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Inclusions & Exclusions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="hotel" checked={form.hotel_included} onChange={e => set('hotel_included', e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <label htmlFor="hotel" style={{ margin: 0 }}>Hotel Included</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="meals" checked={form.meals_included} onChange={e => set('meals_included', e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <label htmlFor="meals" style={{ margin: 0 }}>Meals Included</label>
            </div>
          </div>
          <div><label>Package Includes (one per line)</label><textarea rows={4} value={form.includes} onChange={e => set('includes', e.target.value)} placeholder="AC Transport&#10;Hotel stay&#10;Breakfast" /></div>
          <div><label>Package Excludes (one per line)</label><textarea rows={3} value={form.excludes} onChange={e => set('excludes', e.target.value)} placeholder="Personal expenses&#10;Entry fees" /></div>
        </div>

        {/* Images */}
        <div className="card space-y-6">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Images</h2>
          <SingleImageUploader
            value={form.image}
            onChange={url => set('image', url)}
            bucket="package-images"
            folder="main"
            label="Main Package Image"
          />
          <GalleryImageUploader
            value={form.gallery}
            onChange={urls => set('gallery', urls)}
            bucket="package-images"
            folder="gallery"
            maxImages={10}
          />
        </div>

        {/* Status */}
        <div className="card">
          <h2 className="font-bold mb-4" style={{ color: 'var(--foreground)' }}>Status & Visibility</h2>
          <div className="flex flex-wrap gap-6">
            {[['is_active', 'Published (Live on website)'], ['featured', 'Featured Package'], ['popular', 'Popular Package']].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer" style={{ margin: 0 }}>
                <input type="checkbox" checked={(form as any)[key]} onChange={e => set(key, e.target.checked)} style={{ width: '18px', height: '18px' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" /> : <Save size={15} />}
            {saving ? 'Saving...' : isNew ? 'Create Package' : 'Update Package'}
          </button>
          <Link href="/dashboard/packages" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
