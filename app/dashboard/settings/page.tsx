'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { MediaPickerField } from '@/components/MediaLibrary'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [id, setId] = useState<number | null>(null)
  const [form, setForm] = useState({
    company_name: 'Saanvi Royal Travels',
    tagline: 'Your Trusted Travel Partner',
    logo_url: '', favicon_url: '',
    phone: '', whatsapp: '', email: '', email2: '',
    address: '', city: '', state: '', pincode: '',
    google_map_url: '', gst_number: '',
    upi_id: '', upi_qr_url: '',
    bank_name: '', bank_account: '', bank_ifsc: '', bank_holder: '',
    facebook_url: '', instagram_url: '', youtube_url: '', twitter_url: '',
    footer_text: ''
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('website_settings').select('*').limit(1).single()
    if (data) { setId(data.id); setForm(prev => ({ ...prev, ...data })) }
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const { error } = id
      ? await supabase.from('website_settings').update(form).eq('id', id)
      : await supabase.from('website_settings').insert(form)
    if (error) toast.error(error.message)
    else { toast.success('Settings saved! Changes are live instantly.'); load() }
    setSaving(false)
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const Field = ({ label, field, type = 'text', placeholder = '' }: any) => (
    <div>
      <label>{label}</label>
      <input type={type} value={(form as any)[field]} onChange={e => set(field, e.target.value)} placeholder={placeholder} />
    </div>
  )

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" /></div>

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Website Settings</h1>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Manage company info, contact details and social links</p>
      </div>

      {/* Company */}
      <div className="card space-y-4">
        <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Company Information</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Company Name" field="company_name" />
          <Field label="Tagline" field="tagline" />
          <Field label="GST Number" field="gst_number" />
          <Field label="Footer Text" field="footer_text" />
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <label>Logo</label>
            <MediaPickerField
              value={form.logo_url}
              onChange={url => set('logo_url', url)}
              label="Company Logo"
              category="logos"
              placeholder="Select your company logo from Media Library"
            />
          </div>
          <div>
            <label>Favicon</label>
            <MediaPickerField
              value={form.favicon_url}
              onChange={url => set('favicon_url', url)}
              label="Favicon (browser tab icon)"
              category="logos"
              placeholder="Select a square icon (32×32 or 64×64)"
            />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="card space-y-4">
        <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Contact Details</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Phone Number" field="phone" placeholder="+91 98765 43210" />
          <Field label="WhatsApp Number" field="whatsapp" placeholder="919876543210" />
          <Field label="Email" field="email" type="email" />
          <Field label="Email 2 (optional)" field="email2" type="email" />
          <div className="md:col-span-2"><Field label="Office Address" field="address" /></div>
          <Field label="City" field="city" placeholder="Siwan" />
          <Field label="State" field="state" placeholder="Bihar" />
          <Field label="Pincode" field="pincode" />
          <div className="md:col-span-2"><Field label="Google Map Embed URL" field="google_map_url" placeholder="https://maps.google.com/..." /></div>
        </div>
      </div>

      {/* Payment */}
      <div className="card space-y-4">
        <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Payment Details</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="UPI ID" field="upi_id" placeholder="saanvi@upi" />
          <Field label="UPI QR Code URL" field="upi_qr_url" />
          <Field label="Bank Name" field="bank_name" />
          <Field label="Account Holder" field="bank_holder" />
          <Field label="Account Number" field="bank_account" />
          <Field label="IFSC Code" field="bank_ifsc" />
        </div>
      </div>

      {/* Social */}
      <div className="card space-y-4">
        <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Social Media Links</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Facebook URL" field="facebook_url" />
          <Field label="Instagram URL" field="instagram_url" />
          <Field label="YouTube URL" field="youtube_url" />
          <Field label="Twitter/X URL" field="twitter_url" />
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary">
        {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" /> : <Save size={15} />}
        {saving ? 'Saving...' : 'Save All Settings'}
      </button>
    </div>
  )
}
