'use client'
/**
 * /dashboard/invoices/new/page.tsx
 * Create New Invoice page.
 * MODIFIED: GST-aware invoice numbering (SRT-GST-YYYY-NNNN vs SRT-INV-YYYY-NNNN)
 *           Duplicate-safe retry logic.
 *           Auto-hint GST from booking preference.
 */
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronLeft, Download, Save, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { InvoiceData } from '@/components/InvoicePDF/InvoiceTemplate'
import { formatCurrency } from '@/lib/utils'

// Dynamic import — InvoiceTemplate uses browser APIs
const InvoiceTemplate = dynamic(
  () => import('@/components/InvoicePDF/InvoiceTemplate'),
  { ssr: false, loading: () => <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" /></div> }
)

// ─── Constants ──────────────────────────────────────────────
const COMPANY_DEFAULTS = {
  companyName: 'Saanvi Royal Travels',
  companyAddress: 'Karnpura, Tarwara, Siwan, Bihar 841226',
  companyPhone: '+91 9229764300',
  companyWhatsApp: '+91 9939814111',
  companyEmail: 'saanviroyaltravels@gmail.com',
  gstin: '10GXCPK1034H1Z3',
  udyam: 'UDYAM-BR-35-0015333',
}

// ─── GST-Aware Invoice Number Generator ────────────────────
// Atomic Sequences: SRT/YYYY/1 (GST) vs SRT-INV-YYYY-0001 (Non-GST)
async function generateUniqueInvoiceNumber(isGST: boolean, supabase: any): Promise<string> {
  const year = new Date().getFullYear()

  // 1. Try PostgreSQL RPC
  const { data: rpcNum, error: rpcErr } = await supabase.rpc('fn_next_invoice_number', {
    p_is_gst: isGST,
    p_year: year
  })

  if (!rpcErr && rpcNum) {
    return rpcNum
  }

  // 2. Fallback using invoice_sequences table
  const seqName = isGST ? `gst_${year}` : `nongst_${year}`
  const { data: seqRow } = await supabase
    .from('invoice_sequences')
    .select('current_val')
    .eq('sequence_name', seqName)
    .maybeSingle()

  const nextVal = (seqRow?.current_val || 0) + 1
  await supabase
    .from('invoice_sequences')
    .upsert({ sequence_name: seqName, current_val: nextVal, updated_at: new Date().toISOString() })

  if (isGST) {
    return `SRT/${year}/${nextVal}`
  }
  return `SRT-INV-${year}-${String(nextVal).padStart(4, '0')}`
}

// ─── Amount Helpers ─────────────────────────────────────────
function calculateAmounts(original: number, discType: string, discValue: number) {
  let discAmount = 0
  if (discType === 'percentage') discAmount = Math.round((original * discValue) / 100)
  if (discType === 'fixed') discAmount = Math.min(discValue, original)
  const finalAmount = Math.max(0, original - discAmount)
  return { discountAmount: discAmount, finalAmount }
}

// ─── Main Component (inner — wrapped in Suspense for useSearchParams) ──────────
function NewInvoicePageInner() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Form state
  const [bookingSearch, setBookingSearch] = useState('')
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [bookingSearchResults, setBookingSearchResults] = useState<any[]>([])
  const [showBookingDropdown, setShowBookingDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])

  // Customer
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  // Trip
  const [journeyDate, setJourneyDate] = useState('')
  const [journeyTime, setJourneyTime] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
  const [dropAddress, setDropAddress] = useState('')
  const [vehicleName, setVehicleName] = useState('')
  const [tripType, setTripType] = useState('')

  // Amounts
  const [originalAmount, setOriginalAmount] = useState(0)
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none')
  const [discountValue, setDiscountValue] = useState(0)

  // GST
  const [gstApplicable, setGstApplicable] = useState(false)
  const [gstRate, setGstRate] = useState(18)
  // Track if the linked booking requested GST (for hint only)
  const [bookingWantsGst, setBookingWantsGst] = useState<boolean | null>(null)

  // Extra
  const [paymentQrUrl, setPaymentQrUrl] = useState('/sbi-payment-qr.png')
  const [paymentNote, setPaymentNote] = useState('Scan with any UPI App (GPay, PhonePe, Paytm, BHIM, Yono SBI) for instant payment.')
  const [notes, setNotes] = useState('')

  // Active offer (from DB)
  const [activeOffer, setActiveOffer] = useState<any | null>(null)

  // Company settings from DB
  const [companySettings, setCompanySettings] = useState(COMPANY_DEFAULTS)

  // UI state
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [tab, setTab] = useState<'form' | 'preview'>('form')

  // Computed amounts
  const { discountAmount, finalAmount } = calculateAmounts(originalAmount, discountType, discountValue)
  const gstAmount = gstApplicable ? Math.round(((finalAmount) * gstRate) / 100) : 0
  const grandTotal = finalAmount + gstAmount

  // ─── Lifecycle ────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    // Load site_settings (business name, address, phone, email)
    const { data: settings } = await supabase.from('site_settings').select('setting_key,setting_value')
    if (settings) {
      const s: Record<string, string> = {}
      settings.forEach((r: any) => { s[r.setting_key] = r.setting_value })
      setCompanySettings(prev => ({
        ...prev,
        companyName: s['business_name'] || COMPANY_DEFAULTS.companyName,
        companyAddress: s['office_address'] || COMPANY_DEFAULTS.companyAddress,
        companyPhone: s['phone'] && !s['phone'].includes('98765') ? s['phone'] : COMPANY_DEFAULTS.companyPhone,
        companyWhatsApp: s['whatsapp'] && !s['whatsapp'].includes('9876543210') ? s['whatsapp'] : COMPANY_DEFAULTS.companyWhatsApp,
        companyEmail: s['email'] && !s['email'].includes('info@saanviroyaltravels') ? s['email'] : COMPANY_DEFAULTS.companyEmail,
      }))
    }

    // Load invoice_settings — GSTIN, Udyam, QR URL
    const { data: invSettings } = await supabase
      .from('invoice_settings')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (invSettings) {
      setCompanySettings(prev => ({
        ...prev,
        gstin: invSettings.gstin || COMPANY_DEFAULTS.gstin,
        udyam: invSettings.udyam || COMPANY_DEFAULTS.udyam,
        companyAddress: invSettings.business_address || prev.companyAddress,
        companyPhone: invSettings.business_phone || prev.companyPhone,
        companyWhatsApp: invSettings.business_whatsapp || prev.companyWhatsApp,
        companyEmail: invSettings.business_email || prev.companyEmail,
      }))
      if (invSettings.payment_qr_url) setPaymentQrUrl(invSettings.payment_qr_url)
    }

    // Load active offers
    const { data: offers } = await supabase
      .from('offers')
      .select('*')
      .eq('is_active', true)
      .order('priority')
      .limit(1)
    if (offers && offers.length > 0) setActiveOffer(offers[0])

    // Load all bookings for search
    const { data: bks } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
    setBookings(bks || [])
  }, [supabase])

  useEffect(() => { loadInitialData() }, [loadInitialData])

  // Pre-populate from URL params (when navigating from bookings page via Generate Invoice)
  useEffect(() => {
    const bookingId = searchParams.get('bookingId')
    const customer = searchParams.get('customer')
    const phone = searchParams.get('phone')
    const email = searchParams.get('email')
    const pickup = searchParams.get('pickup')
    const drop = searchParams.get('drop')
    const vehicle = searchParams.get('vehicle')
    const date = searchParams.get('date')
    const amount = searchParams.get('amount')
    const gst = searchParams.get('gst')

    if (bookingId) setBookingSearch(bookingId)
    if (customer) setCustomerName(customer)
    if (phone) setCustomerPhone(phone)
    if (email) setCustomerEmail(email)
    if (pickup) setPickupAddress(pickup)
    if (drop) setDropAddress(drop)
    if (vehicle) setVehicleName(vehicle)
    if (date) setJourneyDate(date)
    if (amount) setOriginalAmount(Number(amount))
    if (gst === '1') setGstApplicable(true)
  }, []) // run once on mount // eslint-disable-line react-hooks/exhaustive-deps

  // Re-generate invoice number whenever gstApplicable changes
  // so the number always matches the correct series
  useEffect(() => {
    let cancelled = false
    generateUniqueInvoiceNumber(gstApplicable, supabase).then(num => {
      if (!cancelled) setInvoiceNumber(num)
    }).catch(() => {
      // Fallback if DB not reachable
      const year = new Date().getFullYear()
      const prefix = gstApplicable ? `SRT-GST-${year}` : `SRT-INV-${year}`
      if (!cancelled) setInvoiceNumber(`${prefix}-0001`)
    })
    return () => { cancelled = true }
  }, [gstApplicable]) // eslint-disable-line react-hooks/exhaustive-deps

  // Booking search
  useEffect(() => {
    if (!bookingSearch.trim()) { setBookingSearchResults([]); return }
    const q = bookingSearch.toLowerCase()
    const results = bookings.filter(b =>
      b.booking_number?.toLowerCase().includes(q) ||
      b.customer_name?.toLowerCase().includes(q) ||
      b.customer_mobile?.includes(q)
    ).slice(0, 8)
    setBookingSearchResults(results)
    setShowBookingDropdown(results.length > 0)
  }, [bookingSearch, bookings])

  // Click outside to close dropdown
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowBookingDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function selectBooking(b: any) {
    setSelectedBooking(b)
    setCustomerName(b.customer_name || '')
    setCustomerPhone(b.customer_mobile || '')
    setCustomerEmail(b.customer_email || '')
    setPickupAddress(b.pickup_address || '')
    setDropAddress(b.destination || b.drop_address || '')
    setVehicleName(b.vehicle_type || '')
    setTripType((b.booking_type || '').replace(/_/g, ' '))
    setJourneyDate(b.travel_date || '')
    setOriginalAmount(Number(b.total_amount || b.fare || 0))
    setBookingSearch(`${b.booking_number} — ${b.customer_name}`)
    setShowBookingDropdown(false)

    // Auto-hint GST from booking preference (saved when customer submitted)
    const wantsGst = b.gst_invoice_required === true
    setBookingWantsGst(b.gst_invoice_required === null ? null : b.gst_invoice_required)
    if (wantsGst) {
      setGstApplicable(true)
    }
  }

  // ─── Invoice data object (for preview and save) ────────────
  const invoiceData: InvoiceData = {
    invoiceNumber,
    invoiceDate,
    paymentStatus: 'Unpaid',
    ...companySettings,
    customerName: customerName || 'Customer Name',
    customerPhone,
    customerEmail,
    customerAddress,
    bookingId: selectedBooking?.booking_number,
    journeyDate,
    journeyTime,
    pickupAddress,
    dropAddress,
    vehicleName,
    tripType,
    originalAmount,
    discountType,
    discountValue,
    discountAmount,
    finalAmount,
    gstApplicable,
    gstRate,
    gstAmount,
    paymentQrUrl,
    paymentNote,
    offerTitle: activeOffer?.title,
    offerDescription: activeOffer?.description,
    offerPromoCode: activeOffer?.promo_code,
    offerValidUntil: activeOffer?.valid_until,
    invoiceTerms: 'Thank you for choosing Saanvi Royal Travels. We look forward to serving you again!',
  }

  // ─── Save to DB (with duplicate-safe retry) ─────────────────
  async function handleSave(download = false) {
    if (!customerName.trim()) { toast.error('Customer name is required'); return }
    if (originalAmount <= 0) { toast.error('Enter a valid booking amount'); return }

    setSaving(true)
    try {
      // Generate a fresh invoice number right before saving (avoids stale number from state)
      let finalInvoiceNumber = invoiceNumber
      let saved = false
      let lastError: any = null

      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          // On retry, generate a fresh number
          finalInvoiceNumber = await generateUniqueInvoiceNumber(gstApplicable, supabase)
          setInvoiceNumber(finalInvoiceNumber)
        }

        const payload = {
          invoice_number: finalInvoiceNumber,
          invoice_date: invoiceDate,
          booking_id: selectedBooking?.booking_number || null,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          customer_address: customerAddress,
          pickup_address: pickupAddress,
          drop_address: dropAddress,
          vehicle_name: vehicleName,
          trip_type: tripType,
          journey_date: journeyDate,
          journey_time: journeyTime,
          original_amount: originalAmount,
          discount_type: discountType,
          discount_value: discountValue,
          discount_amount: discountAmount,
          final_amount: finalAmount,
          gst_applicable: gstApplicable,
          gst_rate: gstRate,
          gst_amount: gstAmount,
          payment_qr_url: paymentQrUrl,
          payment_note: paymentNote,
          payment_status: 'Unpaid',
          notes,
          company_name: companySettings.companyName,
          company_address: companySettings.companyAddress,
          company_phone: companySettings.companyPhone,
          company_whatsapp: companySettings.companyWhatsApp,
          company_email: companySettings.companyEmail,
          gstin: companySettings.gstin,
          udyam: companySettings.udyam,
          offer_title: activeOffer?.title || null,
          offer_description: activeOffer?.description || null,
          offer_promo_code: activeOffer?.promo_code || null,
          offer_valid_until: activeOffer?.valid_until || null,
          invoice_terms: invoiceData.invoiceTerms,
        }

        const { error } = await supabase.from('invoices').insert(payload)

        if (!error) {
          saved = true
          break
        }

        // Duplicate invoice_number — retry with new number
        if (error.code === '23505' && error.message?.includes('invoice_number')) {
          lastError = error
          continue
        }

        // Other error — throw immediately
        throw error
      }

      if (!saved) {
        throw lastError || new Error('Failed to generate a unique invoice number. Please try again.')
      }

      toast.success(`Invoice ${finalInvoiceNumber} saved!`)

      if (download) {
        setDownloading(true)
        const { generateInvoicePDF } = await import('@/components/InvoicePDF/generateInvoicePDF')
        await generateInvoicePDF({ ...invoiceData, invoiceNumber: finalInvoiceNumber })
        setDownloading(false)
      }

      router.push('/dashboard/invoices')
    } catch (e: any) {
      console.error('[invoices/new] Save failed:', e)
      toast.error('Save failed: ' + (e.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices" className="btn-ghost p-2">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>New Invoice</h1>
            <p className="text-sm font-mono font-bold" style={{ color: gstApplicable ? '#16a34a' : '#2563eb' }}>{invoiceNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab(tab === 'form' ? 'preview' : 'form')} className="btn-ghost">
            {tab === 'form' ? '👁 Preview' : '✏️ Edit'}
          </button>
          <button onClick={() => handleSave(false)} disabled={saving} className="btn-ghost disabled:opacity-50">
            <Save size={15} /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving || downloading} className="btn-primary disabled:opacity-50">
            <Download size={15} /> {saving || downloading ? 'Processing...' : 'Save & Download PDF'}
          </button>
        </div>
      </div>

      {tab === 'form' ? (
        <div className="grid lg:grid-cols-2 gap-5">

          {/* ─── Left: Form ──────────────────────────────────── */}
          <div className="space-y-5">

            {/* 1. Booking Search */}
            <div className="card space-y-4">
              <h3 className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>
                📋 Link to Booking <span className="font-normal text-xs ml-1 text-blue-500">(optional)</span>
              </h3>
              <div ref={searchRef} className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  className="pl-9"
                  placeholder="Search booking by ID, customer name or phone..."
                  value={bookingSearch}
                  onChange={e => setBookingSearch(e.target.value)}
                  onFocus={() => { if (bookingSearchResults.length) setShowBookingDropdown(true) }}
                />
                {showBookingDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 card p-0 overflow-hidden"
                    style={{ maxHeight: 280, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', marginTop: 4 }}>
                    {bookingSearchResults.map(b => (
                      <button key={b.id} onClick={() => selectBooking(b)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b"
                        style={{ borderColor: 'var(--border)' }}>
                        <span className="font-mono text-xs font-bold text-blue-600">{b.booking_number}</span>
                        <span className="text-sm font-medium ml-3" style={{ color: 'var(--foreground)' }}>{b.customer_name}</span>
                        <span className="text-xs ml-2" style={{ color: 'var(--muted-foreground)' }}>{b.customer_mobile}</span>
                        {(b.total_amount || b.fare) && (
                          <span className="text-xs ml-2 font-semibold text-green-600">₹{b.total_amount || b.fare}</span>
                        )}
                        {b.gst_invoice_required === true && (
                          <span className="text-xs ml-2 font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">GST</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedBooking && (
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <div>
                    <p className="text-xs font-mono font-bold text-blue-600">{selectedBooking.booking_number}</p>
                    <p className="text-sm font-medium">{selectedBooking.customer_name}</p>
                    {bookingWantsGst === true && (
                      <p className="text-xs text-green-700 font-semibold mt-0.5">✓ Customer requested GST invoice — GST has been enabled</p>
                    )}
                    {bookingWantsGst === false && (
                      <p className="text-xs text-slate-500 mt-0.5">Customer did not request GST invoice</p>
                    )}
                  </div>
                  <button onClick={() => {
                    setSelectedBooking(null)
                    setBookingSearch('')
                    setBookingWantsGst(null)
                  }} className="text-xs text-red-500">✕ Clear</button>
                </div>
              )}
            </div>

            {/* 2. Customer Details */}
            <div className="card space-y-4">
              <h3 className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>👤 Customer Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>Customer Name *</label>
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full Name" />
                </div>
                <div>
                  <label>Phone *</label>
                  <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+91 XXXXXXXXXX" />
                </div>
                <div>
                  <label>Email</label>
                  <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@example.com" type="email" />
                </div>
                <div>
                  <label>Customer Address</label>
                  <input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="City, State" />
                </div>
              </div>
            </div>

            {/* 3. Trip Details */}
            <div className="card space-y-4">
              <h3 className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>🚗 Trip Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>Journey Date</label>
                  <input type="date" value={journeyDate} onChange={e => setJourneyDate(e.target.value)} />
                </div>
                <div>
                  <label>Journey Time</label>
                  <input type="time" value={journeyTime} onChange={e => setJourneyTime(e.target.value)} />
                </div>
                <div>
                  <label>Pickup Address</label>
                  <input value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} placeholder="Pickup location" />
                </div>
                <div>
                  <label>Drop Address</label>
                  <input value={dropAddress} onChange={e => setDropAddress(e.target.value)} placeholder="Destination" />
                </div>
                <div>
                  <label>Vehicle</label>
                  <input value={vehicleName} onChange={e => setVehicleName(e.target.value)} placeholder="e.g. Toyota Innova" list="vehicle-list" />
                  <datalist id="vehicle-list">
                    {['Swift Dzire', 'Toyota Etios', 'Maruti Ertiga', 'Toyota Innova', 'KIA Carens', 'Tempo Traveller'].map(v => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label>Trip Type</label>
                  <select value={tripType} onChange={e => setTripType(e.target.value)}>
                    <option value="">Select type</option>
                    {['One Way', 'Round Trip', 'Local', 'Airport Transfer', 'Outstation', 'Package Tour'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Invoice Date */}
            <div className="card">
              <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--foreground)' }}>📅 Invoice Date</h3>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={{ maxWidth: 200 }} />
            </div>

          </div>

          {/* ─── Right: Amounts + Settings ───────────────────── */}
          <div className="space-y-5">

            {/* Fare Summary */}
            <div className="card space-y-4">
              <h3 className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>💰 Fare Summary</h3>

              <div>
                <label>Booking Amount (₹) *</label>
                <input type="number" min="0" value={originalAmount || ''} onChange={e => setOriginalAmount(Number(e.target.value))} placeholder="0" />
              </div>

              <div>
                <label>Discount Type</label>
                <select value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                  <option value="none">No Discount</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>

              {discountType !== 'none' && (
                <div>
                  <label>{discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount (₹)'}</label>
                  <input type="number" min="0" max={discountType === 'percentage' ? 100 : originalAmount}
                    value={discountValue || ''} onChange={e => setDiscountValue(Number(e.target.value))}
                    placeholder={discountType === 'percentage' ? '10' : '500'} />
                </div>
              )}

              {/* GST Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: gstApplicable ? '#f0fdf4' : 'var(--muted)', border: gstApplicable ? '1px solid #bbf7d0' : 'none' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                      Apply GST
                      {gstApplicable && <span className="ml-2 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Invoice: {invoiceNumber}</span>}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {gstApplicable ? `GST Invoice series — number starts with SRT-GST-` : `Non-GST Invoice series — number starts with SRT-INV-`}
                    </p>
                  </div>
                  <button onClick={() => setGstApplicable(!gstApplicable)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                    style={{ background: gstApplicable ? '#16a34a' : 'var(--border)' }}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${gstApplicable ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {gstApplicable && (
                  <div>
                    <label>GST Rate (%)</label>
                    <select value={gstRate} onChange={e => setGstRate(Number(e.target.value))}>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18% (Standard)</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Live calculation */}
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="flex justify-between px-4 py-2 text-sm" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Booking Amount</span>
                  <span className="font-semibold">{formatCurrency(originalAmount)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between px-4 py-2 text-sm text-green-600" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span>Discount</span>
                    <span className="font-semibold">− {formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {gstApplicable && gstAmount > 0 && (
                  <div className="flex justify-between px-4 py-2 text-sm" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>GST ({gstRate}%)</span>
                    <span className="font-semibold">+ {formatCurrency(gstAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 font-bold text-base"
                  style={{ background: gstApplicable ? '#16a34a' : 'var(--primary)', color: 'white' }}>
                  <span>Grand Total</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Payment QR */}
            <div className="card space-y-3">
              <h3 className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>📲 Payment QR</h3>
              <div>
                <label>QR Code Image URL</label>
                <input value={paymentQrUrl} onChange={e => setPaymentQrUrl(e.target.value)} placeholder="https://... (leave blank to use placeholder)" type="url" />
              </div>
              <div>
                <label>Payment Note</label>
                <input value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="Scan to pay via UPI/GPay/PhonePe" />
              </div>
            </div>

            {/* Notes */}
            <div className="card">
              <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--foreground)' }}>📝 Internal Notes</h3>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes (not shown on invoice)" />
            </div>

            {/* Active Offer preview */}
            {activeOffer && (
              <div className="card" style={{ background: '#fffbeb', border: '1px solid #fbbf24' }}>
                <h3 className="font-bold text-sm mb-2" style={{ color: '#92400e' }}>✦ Active Special Offer (Auto-added to invoice)</h3>
                <p className="font-semibold text-sm text-amber-800">{activeOffer.title}</p>
                {activeOffer.promo_code && (
                  <p className="text-xs text-amber-700 mt-1">Code: <span className="font-mono font-bold">{activeOffer.promo_code}</span></p>
                )}
              </div>
            )}

          </div>
        </div>
      ) : (
        /* ─── Preview Tab ─────────────────────────────────────── */
        <div>
          <p className="text-sm mb-4 text-center" style={{ color: 'var(--muted-foreground)' }}>
            Invoice preview — this is how the PDF will look. Scroll to see the full page.
          </p>
          <div style={{ overflowX: 'auto', padding: '0 0 16px' }}>
            <InvoiceTemplate data={invoiceData} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Default Export — wraps in Suspense for useSearchParams() ─────────────────
export default function NewInvoicePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" />
      </div>
    }>
      <NewInvoicePageInner />
    </Suspense>
  )
}
