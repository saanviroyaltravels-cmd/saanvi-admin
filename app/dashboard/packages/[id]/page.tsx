'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { SingleImageUploader, GalleryImageUploader } from '@/components/ImageUploader'

const VEHICLE_TYPES = ['Innova', 'Innova Crysta', 'Ertiga', 'Traveller', 'Bus', 'Sedan', 'SUV']
const DESTINATIONS = [
  'Ayodhya', 'Varanasi', 'Bodh Gaya', 'Prayagraj', 'Rajgir', 'Nalanda',
  'Patna', 'Lucknow', 'Gorakhpur', 'Kathmandu', 'Ujjain', 'Shirdi'
]

// ── Only the columns that actually exist in the packages table ─────────────────
interface PackageForm {
  title: string
  destination_id: string | null
  destination_name: string
  route: string
  pickup_point: string
  short_description: string
  full_description: string
  travel_date: string
  return_date: string
  duration: string
  price: string
  discount_price: string
  seats: string
  vehicle_type: string
  hotel_included: boolean
  meals_included: boolean
  includes: string
  excludes: string
  image: string
  gallery: string[]
  is_active: boolean
  featured: boolean
  popular: boolean
}

const EMPTY: PackageForm = {
  title: '', destination_id: null, destination_name: '', route: '', pickup_point: '',
  short_description: '', full_description: '',
  travel_date: '', return_date: '', duration: '',
  price: '', discount_price: '', seats: '',
  vehicle_type: 'Innova',
  hotel_included: false, meals_included: false,
  includes: '', excludes: '',
  image: '', gallery: [],
  is_active: true, featured: false, popular: false,
}

export default function PackageFormPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const isNew = params.id === 'new'

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<PackageForm>(EMPTY)

  useEffect(() => { if (!isNew) loadPackage() }, [])

  async function loadPackage() {
    setLoading(true)
    const { data, error } = await supabase
      .from('packages')
      .select([
        'title', 'destination_id', 'destination_name', 'route', 'pickup_point',
        'short_description', 'full_description',
        'travel_date', 'return_date', 'duration',
        'price', 'discount_price', 'seats', 'vehicle_type',
        'hotel_included', 'meals_included',
        'includes', 'excludes',
        'image', 'gallery',
        'is_active', 'featured', 'popular',
      ].join(','))
      .eq('id', params.id)
      .single()

    if (error) { toast.error('Failed to load package: ' + error.message); setLoading(false); return }

    if (data) {
      const d = data as any
      setForm({
        title:             d.title             || '',
        destination_id:    d.destination_id    || null,
        destination_name:  d.destination_name  || '',
        route:             d.route             || '',
        pickup_point:      d.pickup_point      || '',
        short_description: d.short_description || '',
        full_description:  d.full_description  || '',
        travel_date:       d.travel_date       || '',
        return_date:       d.return_date       || '',
        duration:          d.duration          || '',
        price:             String(d.price      ?? ''),
        discount_price:    String(d.discount_price ?? ''),
        seats:             String(d.seats      ?? ''),
        vehicle_type:      d.vehicle_type      || 'Innova',
        hotel_included:    d.hotel_included    ?? false,
        meals_included:    d.meals_included    ?? false,
        includes:          d.includes          || '',
        excludes:          d.excludes          || '',
        image:             d.image             || '',
        gallery:           Array.isArray(d.gallery) ? d.gallery : [],
        is_active:         d.is_active         ?? true,
        featured:          d.featured          ?? false,
        popular:           d.popular           ?? false,
      })
    }
    setLoading(false)
  }

  const set = (field: keyof PackageForm, value: any) =>
    setForm(f => ({ ...f, [field]: value }))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // ── Explicit payload — only known DB columns, no spread of raw DB data ──
    const payload = {
      title:             form.title,
      destination_id:    form.destination_id,
      destination_name:  form.destination_name,
      route:             form.route,
      pickup_point:      form.pickup_point,
      short_description: form.short_description,
      full_description:  form.full_description,
      travel_date:       form.travel_date       || null,
      return_date:       form.return_date       || null,
      duration:          form.duration,
      price:             Number(form.price),
      discount_price:    form.discount_price ? Number(form.discount_price) : null,
      seats:             form.seats ? Number(form.seats) : null,
      vehicle_type:      form.vehicle_type,
      hotel_included:    form.hotel_included,
      meals_included:    form.meals_included,
      includes:          form.includes,
      excludes:          form.excludes,
      image:             form.image,
      gallery:           form.gallery,
      is_active:         form.is_active,
      featured:          form.featured,
      popular:           form.popular,
    }

    const { error } = isNew
      ? await supabase.from('packages').insert(payload)
      : await supabase.from('packages').update(payload).eq('id', params.id)

    if (error) toast.error(error.message)
    else {
      toast.success(isNew ? 'Package created!' : 'Package updated!')
      router.push('/dashboard/packages')
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" />
    </div>
  )

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/packages" className="p-2 rounded-lg hover:bg-muted"
          style={{ color: 'var(--muted-foreground)' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
            {isNew ? 'Add New Package' : 'Edit Package'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Fill in the details below</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Basic Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label>Package Name *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                required placeholder="Ayodhya Darshan Package" />
            </div>
            <div>
              <label>Destination Name *</label>
              <select value={form.destination_name} onChange={e => set('destination_name', e.target.value)} required>
                <option value="">Select destination</option>
                {DESTINATIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label>Route</label>
              <input value={form.route} onChange={e => set('route', e.target.value)}
                placeholder="Siwan → Ayodhya → Siwan" />
            </div>
            <div>
              <label>Pickup Point</label>
              <input value={form.pickup_point} onChange={e => set('pickup_point', e.target.value)}
                placeholder="Siwan Bus Stand" />
            </div>
            <div>
              <label>Travel Date</label>
              <input type="date" value={form.travel_date} onChange={e => set('travel_date', e.target.value)} />
            </div>
            <div>
              <label>Return Date</label>
              <input type="date" value={form.return_date} onChange={e => set('return_date', e.target.value)} />
            </div>
            <div>
              <label>Duration</label>
              <input value={form.duration} onChange={e => set('duration', e.target.value)}
                placeholder="2 Days 1 Night" />
            </div>
            <div>
              <label>Seats Available</label>
              <input type="number" value={form.seats} onChange={e => set('seats', e.target.value)}
                placeholder="20" />
            </div>
          </div>
          <div>
            <label>
              Short Description{' '}
              <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>
                (shown on package card)
              </span>
            </label>
            <textarea rows={2} value={form.short_description}
              onChange={e => set('short_description', e.target.value)}
              placeholder="Brief summary shown on listing page, e.g. 2 Days Ayodhya Darshan with hotel & meals..." />
          </div>
          <div>
            <label>
              Full Description{' '}
              <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>
                (shown on package detail page)
              </span>
            </label>
            <textarea rows={5} value={form.full_description}
              onChange={e => set('full_description', e.target.value)}
              placeholder="Detailed itinerary, highlights, important notes..." />
          </div>
        </div>

        {/* Pricing */}
        <div className="card space-y-4">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Pricing</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label>Price (₹) *</label>
              <input type="number" value={form.price} onChange={e => set('price', e.target.value)}
                required placeholder="2999" />
            </div>
            <div>
              <label>Discount / Strike Price (₹)</label>
              <input type="number" value={form.discount_price}
                onChange={e => set('discount_price', e.target.value)} placeholder="2499" />
            </div>
            <div>
              <label>Vehicle Type</label>
              <select value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)}>
                {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Inclusions */}
        <div className="card space-y-4">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Inclusions & Exclusions</h2>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer" style={{ margin: 0 }}>
              <input type="checkbox" checked={form.hotel_included}
                onChange={e => set('hotel_included', e.target.checked)}
                style={{ width: '18px', height: '18px' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Hotel Included</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer" style={{ margin: 0 }}>
              <input type="checkbox" checked={form.meals_included}
                onChange={e => set('meals_included', e.target.checked)}
                style={{ width: '18px', height: '18px' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Meals Included</span>
            </label>
          </div>
          <div>
            <label>Package Includes (one per line)</label>
            <textarea rows={4} value={form.includes} onChange={e => set('includes', e.target.value)}
              placeholder={'AC Transport\nHotel stay\nBreakfast'} />
          </div>
          <div>
            <label>Package Excludes (one per line)</label>
            <textarea rows={3} value={form.excludes} onChange={e => set('excludes', e.target.value)}
              placeholder={'Personal expenses\nEntry fees'} />
          </div>
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
            {([
              ['is_active', 'Published (Live on website)'],
              ['featured',  'Featured Package'],
              ['popular',   'Popular Package'],
            ] as [keyof PackageForm, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer" style={{ margin: 0 }}>
                <input type="checkbox" checked={form[key] as boolean}
                  onChange={e => set(key, e.target.checked)}
                  style={{ width: '18px', height: '18px' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" />
              : <Save size={15} />}
            {saving ? 'Saving...' : isNew ? 'Create Package' : 'Update Package'}
          </button>
          <Link href="/dashboard/packages" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
