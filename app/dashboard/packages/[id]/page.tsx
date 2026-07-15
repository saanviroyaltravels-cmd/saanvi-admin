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

// Matches the new Supabase schema exactly
interface PackageForm {
  title: string
  slug: string
  destination_id: string | null
  destination_name: string
  category: string
  duration: string
  duration_days: string | number
  duration_nights: string | number
  price: string | number
  offer_price: string | number
  discount_percent: string | number
  max_seats: string | number
  available_seats: string | number
  vehicle_type_id: string | null
  pickup_point: string
  short_description: string
  full_description: string
  itinerary: string
  inclusions: string
  exclusions: string
  terms_conditions: string
  cover_image: string
  gallery: string[]
  featured: boolean
  is_active: boolean
  booking_open: boolean
  meta_title: string
  meta_description: string
  meta_keywords: string
  sort_order: string | number
}

const EMPTY: PackageForm = {
  title: '', slug: '', destination_id: null, destination_name: '', category: 'Religious Places',
  duration: '', duration_days: 1, duration_nights: 0,
  price: '', offer_price: '', discount_percent: 0,
  max_seats: 10, available_seats: 10, vehicle_type_id: null, pickup_point: '',
  short_description: '', full_description: '', itinerary: '', inclusions: '', exclusions: '', terms_conditions: '',
  cover_image: '', gallery: [],
  featured: false, is_active: true, booking_open: true,
  meta_title: '', meta_description: '', meta_keywords: '', sort_order: 0
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
      .select(`
        title, slug, destination_id, destination_name, category, duration, duration_days, duration_nights,
        price, offer_price, discount_percent, max_seats, available_seats, vehicle_type_id, pickup_point,
        short_description, full_description, itinerary, inclusions, exclusions, terms_conditions,
        cover_image, gallery, featured, is_active, booking_open, meta_title, meta_description, meta_keywords, sort_order
      `)
      .eq('id', params.id)
      .single()

    if (error) { toast.error('Failed to load package: ' + error.message); setLoading(false); return }

    if (data) {
      const d = data as any
      setForm({
        title:             d.title             || '',
        slug:              d.slug              || '',
        destination_id:    d.destination_id    || null,
        destination_name:  d.destination_name  || '',
        category:          d.category          || 'Religious Places',
        duration:          d.duration          || '',
        duration_days:     d.duration_days     || 1,
        duration_nights:   d.duration_nights   || 0,
        price:             d.price             ?? '',
        offer_price:       d.offer_price       ?? '',
        discount_percent:  d.discount_percent  ?? 0,
        max_seats:         d.max_seats         ?? 10,
        available_seats:   d.available_seats   ?? 10,
        vehicle_type_id:   d.vehicle_type_id   || null,
        pickup_point:      d.pickup_point      || '',
        short_description: d.short_description || '',
        full_description:  d.full_description  || '',
        itinerary:         Array.isArray(d.itinerary) ? d.itinerary.join('\n') : (d.itinerary || ''),
        inclusions:        Array.isArray(d.inclusions) ? d.inclusions.join('\n') : (d.inclusions || ''),
        exclusions:        Array.isArray(d.exclusions) ? d.exclusions.join('\n') : (d.exclusions || ''),
        terms_conditions:  d.terms_conditions  || '',
        cover_image:       d.cover_image       || '',
        gallery:           Array.isArray(d.gallery) ? d.gallery : [],
        featured:          d.featured          ?? false,
        is_active:         d.is_active         ?? true,
        booking_open:      d.booking_open      ?? true,
        meta_title:        d.meta_title        || '',
        meta_description:  d.meta_description  || '',
        meta_keywords:     d.meta_keywords     || '',
        sort_order:        d.sort_order        ?? 0,
      })
    }
    setLoading(false)
  }

  const set = (field: keyof PackageForm, value: any) =>
    setForm(f => ({ ...f, [field]: value }))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // Explicit payload mapping to exactly match the database schema
    const payload = {
      title:             form.title,
      slug:              form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      destination_id:    form.destination_id,
      destination_name:  form.destination_name,
      category:          form.category,
      duration:          form.duration,
      duration_days:     Number(form.duration_days) || 0,
      duration_nights:   Number(form.duration_nights) || 0,
      price:             Number(form.price) || 0,
      offer_price:       form.offer_price ? Number(form.offer_price) : null,
      discount_percent:  Number(form.discount_percent) || 0,
      max_seats:         Number(form.max_seats) || 0,
      available_seats:   Number(form.available_seats) || 0,
      vehicle_type_id:   form.vehicle_type_id,
      pickup_point:      form.pickup_point,
      short_description: form.short_description,
      full_description:  form.full_description,
      itinerary:         form.itinerary.split('\n').map(s => s.trim()).filter(Boolean),
      inclusions:        form.inclusions.split('\n').map(s => s.trim()).filter(Boolean),
      exclusions:        form.exclusions.split('\n').map(s => s.trim()).filter(Boolean),
      terms_conditions:  form.terms_conditions,
      cover_image:       form.cover_image,
      gallery:           form.gallery,
      featured:          form.featured,
      is_active:         form.is_active,
      booking_open:      form.booking_open,
      meta_title:        form.meta_title,
      meta_description:  form.meta_description,
      meta_keywords:     form.meta_keywords,
      sort_order:        Number(form.sort_order) || 0,
    }

    console.log('--- PACKAGE UPDATE START ---')
    console.log('packageId (params.id):', params.id)
    console.log('Payload:', payload)

    try {
      if (isNew) {
        const { data, error } = await supabase.from('packages').insert(payload).select()
        console.log('Supabase Insert Response:', { data, error })
        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error('Insert failed: 0 rows inserted. Check if RLS policy blocked INSERT.')
        }
        toast.success('Package created!')
        router.push('/dashboard/packages')
      } else {
        const { data, error } = await supabase.from('packages').update(payload).eq('id', params.id).select()
        console.log('Supabase Update Response:', { data, error })
        
        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error('Update failed: 0 rows modified. Check if ID exists or RLS policy blocked UPDATE.')
        }
        
        toast.success('Package updated successfully!')
        window.location.href = '/dashboard/packages'
      }
    } catch (err: any) {
      console.error('Save error:', err)
      toast.error(err.message || 'Unknown error occurred')
    } finally {
      setSaving(false)
    }
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
              <label>Package Title *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="Ayodhya Darshan Package" />
            </div>
            <div>
              <label>URL Slug</label>
              <input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="ayodhya-darshan-package" />
            </div>
            <div>
              <label>Destination Name *</label>
              <input value={form.destination_name} onChange={e => set('destination_name', e.target.value)} required placeholder="e.g. Ayodhya" />
            </div>
            <div>
              <label>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                <option>Religious Places</option>
                <option>Adventure</option>
              </select>
            </div>
            <div>
              <label>Pickup Point</label>
              <input value={form.pickup_point} onChange={e => set('pickup_point', e.target.value)} placeholder="Siwan Bus Stand" />
            </div>
            <div>
              <label>Duration Text</label>
              <input value={form.duration} onChange={e => set('duration', e.target.value)} placeholder="2 Days 1 Night" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label>Days</label>
                <input type="number" value={form.duration_days} onChange={e => set('duration_days', e.target.value)} />
              </div>
              <div>
                <label>Nights</label>
                <input type="number" value={form.duration_nights} onChange={e => set('duration_nights', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label>Max Seats</label>
                <input type="number" value={form.max_seats} onChange={e => set('max_seats', e.target.value)} />
              </div>
              <div>
                <label>Available Seats</label>
                <input type="number" value={form.available_seats} onChange={e => set('available_seats', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label>Short Description (shown on cards)</label>
            <textarea rows={2} value={form.short_description} onChange={e => set('short_description', e.target.value)} placeholder="Brief summary shown on listing page..." />
          </div>
          <div>
            <label>Full Description (shown on details page)</label>
            <textarea rows={5} value={form.full_description} onChange={e => set('full_description', e.target.value)} placeholder="Detailed overview..." />
          </div>
          <div>
            <label>Itinerary (Day by Day)</label>
            <textarea rows={5} value={form.itinerary} onChange={e => set('itinerary', e.target.value)} placeholder="Day 1: Arrival...&#10;Day 2: Sightseeing..." />
          </div>
        </div>

        {/* Pricing & Offers */}
        <div className="card space-y-4">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Pricing & Availability</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label>Regular Price (₹) *</label>
              <input type="number" value={form.price} onChange={e => set('price', e.target.value)} required placeholder="2999" />
            </div>
            <div>
              <label>Offer Price (₹)</label>
              <input type="number" value={form.offer_price} onChange={e => set('offer_price', e.target.value)} placeholder="2499" />
            </div>
            <div>
              <label>Discount Percent (%)</label>
              <input type="number" value={form.discount_percent} onChange={e => set('discount_percent', e.target.value)} placeholder="15" />
            </div>
          </div>
        </div>

        {/* Inclusions & Terms */}
        <div className="card space-y-4">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Inclusions & Exclusions</h2>
          <div>
            <label>Package Inclusions</label>
            <textarea rows={4} value={form.inclusions} onChange={e => set('inclusions', e.target.value)} placeholder={'AC Transport\nHotel stay\nBreakfast'} />
          </div>
          <div>
            <label>Package Exclusions</label>
            <textarea rows={3} value={form.exclusions} onChange={e => set('exclusions', e.target.value)} placeholder={'Personal expenses\nEntry fees'} />
          </div>
          <div>
            <label>Terms & Conditions</label>
            <textarea rows={3} value={form.terms_conditions} onChange={e => set('terms_conditions', e.target.value)} placeholder="Cancellation policies..." />
          </div>
        </div>

        {/* SEO */}
        <div className="card space-y-4">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>SEO (Search Engine Optimization)</h2>
          <div>
            <label>Meta Title</label>
            <input value={form.meta_title} onChange={e => set('meta_title', e.target.value)} placeholder="Best Ayodhya Package 2026" />
          </div>
          <div>
            <label>Meta Description</label>
            <textarea rows={2} value={form.meta_description} onChange={e => set('meta_description', e.target.value)} placeholder="Book the best Ayodhya darshan package at lowest prices..." />
          </div>
          <div>
            <label>Meta Keywords</label>
            <input value={form.meta_keywords} onChange={e => set('meta_keywords', e.target.value)} placeholder="ayodhya, tour, ram mandir, package" />
          </div>
        </div>

        {/* Images */}
        <div className="card space-y-6">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Images</h2>
          <SingleImageUploader
            value={form.cover_image}
            onChange={url => set('cover_image', url)}
            bucket="package-images"
            folder="main"
            label="Cover Image"
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
              ['booking_open', 'Booking Open'],
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
