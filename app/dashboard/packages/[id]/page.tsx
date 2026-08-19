'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { MediaPickerField, MediaPickerMultiField } from '@/components/MediaLibrary'

const CATEGORIES = ['Religious Places', 'Adventure', 'Heritage & Culture', 'Nature & Wildlife', 'Weekend Getaway']

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
  title_hi: string
  short_description_hi: string
  full_description_hi: string
  highlights: string
  highlights_hi: string
  itinerary_hi: string
  inclusions_hi: string
  exclusions_hi: string
  terms_conditions_hi: string
  route_map_image: string
}

const EMPTY: PackageForm = {
  title: '', slug: '', destination_id: null, destination_name: '', category: 'Religious Places',
  duration: '', duration_days: 1, duration_nights: 0,
  price: '', offer_price: '', discount_percent: 0,
  max_seats: 10, available_seats: 10, vehicle_type_id: null, pickup_point: '',
  short_description: '', full_description: '', itinerary: '', inclusions: '', exclusions: '', terms_conditions: '',
  cover_image: '', gallery: [],
  featured: false, is_active: true, booking_open: true,
  meta_title: '', meta_description: '', meta_keywords: '', sort_order: 0,
  title_hi: '', short_description_hi: '', full_description_hi: '',
  highlights: '', highlights_hi: '', itinerary_hi: '', inclusions_hi: '', exclusions_hi: '', terms_conditions_hi: '', route_map_image: ''
}

function toArray(val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean)
  if (typeof val === 'string') return val.split('\n').map(s => s.trim()).filter(Boolean)
  return []
}

function toTextarea(val: any): string {
  if (!val) return ''
  if (Array.isArray(val)) return val.join('\n')
  return String(val)
}

export default function PackageFormPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const isNew = params.id === 'new'

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<PackageForm>(EMPTY)
  const [langTab, setLangTab] = useState<'en' | 'hi'>('en')

  useEffect(() => {
    if (!isNew) {
      loadPackage()
    }
  }, [params.id])

  async function loadPackage() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        toast.error('Failed to load package: ' + error.message)
        return
      }

      if (data) {
        const d = data as any
        setForm({
          title:                d.title                || '',
          slug:                 d.slug                 || '',
          destination_id:       d.destination_id       || null,
          destination_name:     d.destination_name     || '',
          category:             d.category             || 'Religious Places',
          duration:             d.duration             || '',
          duration_days:        d.duration_days        ?? 1,
          duration_nights:      d.duration_nights      ?? 0,
          price:                d.price                ?? '',
          offer_price:          d.offer_price          ?? '',
          discount_percent:     d.discount_percent     ?? 0,
          max_seats:            d.max_seats            ?? 10,
          available_seats:      d.available_seats      ?? 10,
          vehicle_type_id:      d.vehicle_type_id      || null,
          pickup_point:         d.pickup_point         || '',
          short_description:    d.short_description   || '',
          full_description:     d.full_description    || '',
          itinerary:            toTextarea(d.itinerary),
          inclusions:           toTextarea(d.inclusions),
          exclusions:           toTextarea(d.exclusions),
          terms_conditions:     d.terms_conditions     || '',
          cover_image:          d.cover_image          || '',
          gallery:              Array.isArray(d.gallery) ? d.gallery : [],
          featured:             d.featured             ?? false,
          is_active:            d.is_active            ?? true,
          booking_open:         d.booking_open         ?? true,
          meta_title:           d.meta_title           || '',
          meta_description:     d.meta_description     || '',
          meta_keywords:        d.meta_keywords        || '',
          sort_order:           d.sort_order           ?? 0,
          title_hi:             d.title_hi             || '',
          short_description_hi: d.short_description_hi || '',
          full_description_hi:  d.full_description_hi  || '',
          highlights:           toTextarea(d.highlights),
          highlights_hi:        toTextarea(d.highlights_hi),
          itinerary_hi:         toTextarea(d.itinerary_hi),
          inclusions_hi:        toTextarea(d.inclusions_hi),
          exclusions_hi:        toTextarea(d.exclusions_hi),
          terms_conditions_hi:  d.terms_conditions_hi  || '',
          route_map_image:      d.route_map_image      || '',
        })
      }
    } catch (err: any) {
      console.error('Error in loadPackage:', err)
      toast.error('Unexpected error loading package')
    } finally {
      setLoading(false)
    }
  }

  const set = (field: keyof PackageForm, value: any) =>
    setForm(f => ({ ...f, [field]: value }))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      if (!form.title || !form.title.trim()) {
        toast.error('Package Title is required')
        return
      }

      if (!form.destination_name || !form.destination_name.trim()) {
        toast.error('Destination Name is required')
        return
      }

      if (form.price === '' || isNaN(Number(form.price))) {
        toast.error('Please enter a valid regular price')
        return
      }

      // Explicit payload mapping to exactly match the database schema
      const payload = {
        title:                form.title.trim(),
        slug:                 (form.slug || form.title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        destination_id:       form.destination_id || null,
        destination_name:     form.destination_name.trim(),
        category:             form.category || 'Religious Places',
        duration:             form.duration || '',
        duration_days:        Number(form.duration_days) || 0,
        duration_nights:      Number(form.duration_nights) || 0,
        price:                Number(form.price) || 0,
        offer_price:          form.offer_price !== '' && form.offer_price !== null ? Number(form.offer_price) : null,
        discount_percent:     Number(form.discount_percent) || 0,
        max_seats:            Number(form.max_seats) || 0,
        available_seats:      Number(form.available_seats) || 0,
        vehicle_type_id:      form.vehicle_type_id || null,
        pickup_point:         form.pickup_point || '',
        short_description:    form.short_description || '',
        full_description:     form.full_description || '',
        itinerary:            toArray(form.itinerary),
        inclusions:           toArray(form.inclusions),
        exclusions:           toArray(form.exclusions),
        terms_conditions:     form.terms_conditions || '',
        cover_image:          form.cover_image || '',
        gallery:              Array.isArray(form.gallery) ? form.gallery : [],
        featured:             Boolean(form.featured),
        is_active:            Boolean(form.is_active),
        booking_open:         Boolean(form.booking_open),
        meta_title:           form.meta_title || '',
        meta_description:     form.meta_description || '',
        meta_keywords:        form.meta_keywords || '',
        sort_order:           Number(form.sort_order) || 0,
        title_hi:             form.title_hi || '',
        short_description_hi: form.short_description_hi || '',
        full_description_hi:  form.full_description_hi || '',
        highlights:           toArray(form.highlights),
        highlights_hi:        toArray(form.highlights_hi),
        itinerary_hi:         toArray(form.itinerary_hi),
        inclusions_hi:        toArray(form.inclusions_hi),
        exclusions_hi:        toArray(form.exclusions_hi),
        terms_conditions_hi:  form.terms_conditions_hi || '',
        route_map_image:      form.route_map_image || '',
        updated_at:           new Date().toISOString(),
      }

      console.log('--- PACKAGE UPDATE START ---')
      console.log('packageId (params.id):', params.id)
      console.log('Payload:', payload)

      if (isNew) {
        const { data, error } = await supabase.from('packages').insert(payload).select()
        console.log('Supabase Insert Response:', { data, error })
        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error('Insert failed: 0 rows inserted. Check permissions.')
        }
        toast.success('Package created successfully!')
        router.push('/dashboard/packages')
      } else {
        const { data, error } = await supabase.from('packages').update(payload).eq('id', params.id).select()
        console.log('Supabase Update Response:', { data, error })
        
        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error('Update failed: 0 rows modified. Check if package ID exists or permissions.')
        }
        
        toast.success('Package updated successfully!')
        router.push('/dashboard/packages')
      }
    } catch (err: any) {
      console.error('Save error:', err)
      toast.error(err.message || 'Unable to save package. Please try again.')
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
        
        {/* Language Tabs */}
        <div className="flex space-x-4 mb-4 border-b border-slate-200">
          <button 
            type="button"
            onClick={() => setLangTab('en')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${langTab === 'en' ? 'border-royal-600 text-royal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            English
          </button>
          <button 
            type="button"
            onClick={() => setLangTab('hi')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${langTab === 'hi' ? 'border-royal-600 text-royal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            हिन्दी (Hindi)
          </button>
        </div>
        
        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>
            {langTab === 'hi' ? 'बुनियादी जानकारी (Basic Information - Hindi)' : 'Basic Information'}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label>{langTab === 'hi' ? 'पैकेज शीर्षक (Package Title - Hindi)' : 'Package Title *'}</label>
              {langTab === 'hi' ? (
                <input value={form.title_hi} onChange={e => set('title_hi', e.target.value)} placeholder="अयोध्या दर्शन टूर पैकेज" />
              ) : (
                <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="Ayodhya Darshan Package" />
              )}
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
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                <input type="number" min="0" value={form.duration_days} onChange={e => set('duration_days', e.target.value)} />
              </div>
              <div>
                <label>Nights</label>
                <input type="number" min="0" value={form.duration_nights} onChange={e => set('duration_nights', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label>Max Seats</label>
                <input type="number" min="1" value={form.max_seats} onChange={e => set('max_seats', e.target.value)} />
              </div>
              <div>
                <label>Available Seats</label>
                <input type="number" min="0" value={form.available_seats} onChange={e => set('available_seats', e.target.value)} />
              </div>
            </div>
          </div>

          {langTab === 'hi' ? (
            <>
              <div>
                <label>संक्षिप्त विवरण (Short Description - Hindi)</label>
                <textarea rows={2} value={form.short_description_hi} onChange={e => set('short_description_hi', e.target.value)} placeholder="संक्षिप्त विवरण..." />
              </div>
              <div>
                <label>विस्तृत विवरण (Full Description - Hindi)</label>
                <textarea rows={5} value={form.full_description_hi} onChange={e => set('full_description_hi', e.target.value)} placeholder="विस्तृत विवरण..." />
              </div>
              <div>
                <label>यात्रा कार्यक्रम (Itinerary - Hindi, 1 per line)</label>
                <textarea rows={5} value={form.itinerary_hi} onChange={e => set('itinerary_hi', e.target.value)} placeholder="दिन 1: आगमन...&#10;दिन 2: दर्शन..." />
              </div>
              <div>
                <label>मुख्य आकर्षण (Highlights - Hindi, 1 per line)</label>
                <textarea rows={3} value={form.highlights_hi} onChange={e => set('highlights_hi', e.target.value)} placeholder="राम जन्मभूमि दर्शन&#10;हनुमान गढ़ी आरती" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label>Short Description (shown on cards)</label>
                <textarea rows={2} value={form.short_description} onChange={e => set('short_description', e.target.value)} placeholder="Brief summary shown on listing page..." />
              </div>
              <div>
                <label>Full Description (shown on details page)</label>
                <textarea rows={5} value={form.full_description} onChange={e => set('full_description', e.target.value)} placeholder="Detailed overview..." />
              </div>
              <div>
                <label>Itinerary (Day by Day, 1 per line)</label>
                <textarea rows={5} value={form.itinerary} onChange={e => set('itinerary', e.target.value)} placeholder="Day 1: Arrival and Temple Visit&#10;Day 2: Sightseeing and Return" />
              </div>
              <div>
                <label>Highlights (1 per line)</label>
                <textarea rows={3} value={form.highlights} onChange={e => set('highlights', e.target.value)} placeholder="VIP Temple Darshan&#10;Comfortable AC Cab" />
              </div>
            </>
          )}
        </div>

        {/* Pricing & Availability */}
        <div className="card space-y-4">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Pricing & Availability</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label>Regular Price (₹) *</label>
              <input type="number" min="0" value={form.price} onChange={e => set('price', e.target.value)} required placeholder="2999" />
            </div>
            <div>
              <label>Offer Price (₹)</label>
              <input type="number" min="0" value={form.offer_price} onChange={e => set('offer_price', e.target.value)} placeholder="2499" />
            </div>
            <div>
              <label>Discount Percent (%)</label>
              <input type="number" min="0" max="100" value={form.discount_percent} onChange={e => set('discount_percent', e.target.value)} placeholder="15" />
            </div>
          </div>
        </div>

        {/* Inclusions & Terms */}
        <div className="card space-y-4">
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>
            {langTab === 'hi' ? 'शामिल और बहिष्कृत (Inclusions & Terms - Hindi)' : 'Inclusions & Exclusions'}
          </h2>
          {langTab === 'hi' ? (
            <>
              <div>
                <label>शामिल सुविधाएं (Inclusions - Hindi, 1 per line)</label>
                <textarea rows={4} value={form.inclusions_hi} onChange={e => set('inclusions_hi', e.target.value)} placeholder={'एसी वाहन\nहोटल में रुकना\nनाश्ता'} />
              </div>
              <div>
                <label>शामिल नहीं (Exclusions - Hindi, 1 per line)</label>
                <textarea rows={3} value={form.exclusions_hi} onChange={e => set('exclusions_hi', e.target.value)} placeholder={'व्यक्तिगत खर्च\nप्रवेश शुल्क'} />
              </div>
              <div>
                <label>नियम और शर्तें (Terms & Conditions - Hindi)</label>
                <textarea rows={3} value={form.terms_conditions_hi} onChange={e => set('terms_conditions_hi', e.target.value)} placeholder="रद्दीकरण नीतियां..." />
              </div>
            </>
          ) : (
            <>
              <div>
                <label>Package Inclusions (1 per line)</label>
                <textarea rows={4} value={form.inclusions} onChange={e => set('inclusions', e.target.value)} placeholder={'AC Transport\nHotel stay\nBreakfast'} />
              </div>
              <div>
                <label>Package Exclusions (1 per line)</label>
                <textarea rows={3} value={form.exclusions} onChange={e => set('exclusions', e.target.value)} placeholder={'Personal expenses\nEntry fees'} />
              </div>
              <div>
                <label>Terms & Conditions</label>
                <textarea rows={3} value={form.terms_conditions} onChange={e => set('terms_conditions', e.target.value)} placeholder="Cancellation policies..." />
              </div>
            </>
          )}
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
          <MediaPickerField
            value={form.cover_image}
            onChange={url => set('cover_image', url)}
            label="Cover Image"
            category="packages"
          />
          <MediaPickerMultiField
            value={form.gallery}
            onChange={urls => set('gallery', urls)}
            label="Gallery Images (select multiple)"
            category="packages"
            maxImages={10}
          />
          <MediaPickerField
            value={form.route_map_image}
            onChange={url => set('route_map_image', url)}
            label="Route Map Image (optional)"
            category="packages"
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
                <input type="checkbox" checked={Boolean(form[key])}
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
