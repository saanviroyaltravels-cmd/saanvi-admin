'use client'
/**
 * /dashboard/invoices/[id]/page.tsx
 * View / Edit / Re-download individual invoice.
 * MODIFIED: Added full inline editing capability.
 * Invoice number is immutable once created.
 */
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronLeft, Download, Edit2, Save, X } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { InvoiceData } from '@/components/InvoicePDF/InvoiceTemplate'
import { formatCurrency } from '@/lib/utils'

const InvoiceTemplate = dynamic(
  () => import('@/components/InvoicePDF/InvoiceTemplate'),
  { ssr: false, loading: () => <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" /></div> }
)

function statusColor(s: string): React.CSSProperties {
  if (s === 'Paid') return { background: '#d1fae5', color: '#065f46' }
  if (s === 'Partial') return { background: '#fef3c7', color: '#92400e' }
  return { background: '#fee2e2', color: '#991b1b' }
}

function calculateAmounts(original: number, discType: string, discValue: number) {
  let discAmount = 0
  if (discType === 'percentage') discAmount = Math.round((original * discValue) / 100)
  if (discType === 'fixed') discAmount = Math.min(discValue, original)
  const finalAmount = Math.max(0, original - discAmount)
  return { discountAmount: discAmount, finalAmount }
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const supabase = createClient()
  const [inv, setInv] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit mode state
  const [editMode, setEditMode] = useState(false)

  // Editable fields (initialized from inv when entering edit mode)
  const [paymentStatus, setPaymentStatus] = useState('Unpaid')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [journeyDate, setJourneyDate] = useState('')
  const [journeyTime, setJourneyTime] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
  const [dropAddress, setDropAddress] = useState('')
  const [vehicleName, setVehicleName] = useState('')
  const [tripType, setTripType] = useState('')
  const [originalAmount, setOriginalAmount] = useState(0)
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none')
  const [discountValue, setDiscountValue] = useState(0)
  const [gstApplicable, setGstApplicable] = useState(false)
  const [gstRate, setGstRate] = useState(18)
  const [paymentNote, setPaymentNote] = useState('')
  const [notes, setNotes] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', params.id as string)
        .single()

      if (error || !data) {
        toast.error('Invoice not found')
        setLoading(false)
        return
      }

      setInv(data)
      populateEditFields(data)
      setLoading(false)
    }
    load()
  }, [params.id, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  function populateEditFields(data: any) {
    setPaymentStatus(data.payment_status || 'Unpaid')
    setCustomerName(data.customer_name || '')
    setCustomerPhone(data.customer_phone || '')
    setCustomerEmail(data.customer_email || '')
    setCustomerAddress(data.customer_address || '')
    setJourneyDate(data.journey_date || '')
    setJourneyTime(data.journey_time || '')
    setPickupAddress(data.pickup_address || '')
    setDropAddress(data.drop_address || '')
    setVehicleName(data.vehicle_name || '')
    setTripType(data.trip_type || '')
    setOriginalAmount(Number(data.original_amount) || 0)
    setDiscountType((data.discount_type as any) || 'none')
    setDiscountValue(Number(data.discount_value) || 0)
    setGstApplicable(data.gst_applicable || false)
    setGstRate(Number(data.gst_rate) || 18)
    setPaymentNote(data.payment_note || '')
    setNotes(data.notes || '')
    setInvoiceDate(data.invoice_date || '')
  }

  function enterEditMode() {
    populateEditFields(inv)
    setEditMode(true)
  }

  function cancelEdit() {
    populateEditFields(inv)
    setEditMode(false)
  }

  async function updatePayStatus(status: string) {
    setPaymentStatus(status)
    await supabase.from('invoices').update({ payment_status: status }).eq('id', params.id as string)
    setInv((prev: any) => ({ ...prev, payment_status: status }))
    toast.success('Payment status updated')
  }

  async function handleSave() {
    if (!customerName.trim()) { toast.error('Customer name is required'); return }

    setSaving(true)
    try {
      const { discountAmount, finalAmount } = calculateAmounts(originalAmount, discountType, discountValue)
      const gstAmount = gstApplicable ? Math.round((finalAmount * gstRate) / 100) : 0

      const updates = {
        invoice_date: invoiceDate,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_address: customerAddress,
        journey_date: journeyDate,
        journey_time: journeyTime,
        pickup_address: pickupAddress,
        drop_address: dropAddress,
        vehicle_name: vehicleName,
        trip_type: tripType,
        original_amount: originalAmount,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        gst_applicable: gstApplicable,
        gst_rate: gstRate,
        gst_amount: gstAmount,
        payment_note: paymentNote,
        payment_status: paymentStatus,
        notes,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', params.id as string)

      if (error) throw error

      // Refresh the local inv state with the updated data
      setInv((prev: any) => ({
        ...prev,
        ...updates,
      }))

      setEditMode(false)
      toast.success('Invoice updated successfully')
    } catch (e: any) {
      console.error('[invoices/edit] Save failed:', e)
      toast.error('Save failed: ' + (e.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDownload() {
    if (!inv) return
    setDownloading(true)
    try {
      const { generateInvoicePDF } = await import('@/components/InvoicePDF/generateInvoicePDF')
      await generateInvoicePDF(buildInvoiceData(inv))
      toast.success('PDF downloaded!')
    } catch (e: any) {
      toast.error('PDF error: ' + e.message)
    } finally {
      setDownloading(false)
    }
  }

  function buildInvoiceData(i: any): InvoiceData {
    const { discountAmount, finalAmount } = calculateAmounts(
      Number(i.original_amount) || 0,
      i.discount_type || 'none',
      Number(i.discount_value) || 0
    )
    const gstAmt = i.gst_applicable ? Math.round((finalAmount * (Number(i.gst_rate) || 18)) / 100) : 0
    return {
      invoiceNumber: i.invoice_number,
      invoiceDate: i.invoice_date,
      paymentStatus: i.payment_status,
      companyName: i.company_name || 'Saanvi Royal Travels',
      companyAddress: i.company_address || 'Karnpura, Tarwara, Siwan, Bihar 841226',
      companyPhone: i.company_phone || '+91 9229764300',
      companyWhatsApp: i.company_whatsapp || '+91 9939814111',
      companyEmail: i.company_email || 'saanviroyaltravels@gmail.com',
      gstin: i.gstin || '10GXCPK1034H1Z3',
      udyam: i.udyam || 'UDYAM-BR-35-0015333',
      customerName: i.customer_name,
      customerPhone: i.customer_phone,
      customerEmail: i.customer_email,
      customerAddress: i.customer_address,
      bookingId: i.booking_id,
      journeyDate: i.journey_date,
      journeyTime: i.journey_time,
      pickupAddress: i.pickup_address,
      dropAddress: i.drop_address,
      vehicleName: i.vehicle_name,
      tripType: i.trip_type,
      originalAmount: Number(i.original_amount) || 0,
      discountType: i.discount_type || 'none',
      discountValue: Number(i.discount_value) || 0,
      discountAmount: Number(i.discount_amount) || discountAmount,
      finalAmount: Number(i.final_amount) || finalAmount,
      gstApplicable: i.gst_applicable || false,
      gstRate: Number(i.gst_rate) || 18,
      gstAmount: Number(i.gst_amount) || gstAmt,
      paymentQrUrl: i.payment_qr_url,
      paymentNote: i.payment_note,
      offerTitle: i.offer_title,
      offerDescription: i.offer_description,
      offerPromoCode: i.offer_promo_code,
      offerValidUntil: i.offer_valid_until,
      invoiceTerms: i.invoice_terms,
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" />
      </div>
    )
  }

  if (!inv) {
    return (
      <div className="text-center py-24">
        <p className="text-4xl mb-4">❌</p>
        <p className="font-semibold">Invoice not found</p>
        <Link href="/dashboard/invoices" className="btn-primary mt-4 inline-flex">← Back to Invoices</Link>
      </div>
    )
  }

  // Current display amounts (live-computed during edit, from DB when viewing)
  const displayOriginal = editMode ? originalAmount : (Number(inv.original_amount) || 0)
  const displayDiscType = editMode ? discountType : (inv.discount_type || 'none')
  const displayDiscVal = editMode ? discountValue : (Number(inv.discount_value) || 0)
  const { discountAmount: displayDiscAmt, finalAmount: displayFinal } = calculateAmounts(displayOriginal, displayDiscType, displayDiscVal)
  const displayGstApplicable = editMode ? gstApplicable : (inv.gst_applicable || false)
  const displayGstRate = editMode ? gstRate : (Number(inv.gst_rate) || 18)
  const displayGstAmount = displayGstApplicable ? Math.round((displayFinal * displayGstRate) / 100) : 0
  const displayGrandTotal = displayFinal + displayGstAmount

  const previewInv = editMode ? {
    ...inv,
    invoice_date: invoiceDate,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    customer_address: customerAddress,
    journey_date: journeyDate,
    journey_time: journeyTime,
    pickup_address: pickupAddress,
    drop_address: dropAddress,
    vehicle_name: vehicleName,
    trip_type: tripType,
    original_amount: originalAmount,
    discount_type: discountType,
    discount_value: discountValue,
    discount_amount: displayDiscAmt,
    final_amount: displayFinal,
    gst_applicable: gstApplicable,
    gst_rate: gstRate,
    gst_amount: displayGstAmount,
    payment_note: paymentNote,
    payment_status: paymentStatus,
    notes,
  } : inv

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices" className="btn-ghost p-2">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{inv.invoice_number}</h1>
              {inv.gst_applicable && (
                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">GST</span>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{inv.customer_name} · {inv.invoice_date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Payment status badge */}
          <select
            value={paymentStatus}
            onChange={e => updatePayStatus(e.target.value)}
            style={{ ...statusColor(paymentStatus), border: 'none', borderRadius: 99, padding: '6px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: 'auto' }}>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
          </select>

          {editMode ? (
            <>
              <button onClick={cancelEdit} disabled={saving} className="btn-ghost flex items-center gap-1.5 disabled:opacity-50">
                <X size={15} /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
                <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button onClick={enterEditMode} className="btn-ghost flex items-center gap-1.5">
                <Edit2 size={15} /> Edit Invoice
              </button>
              <button onClick={handleDownload} disabled={downloading} className="btn-primary disabled:opacity-50 flex items-center gap-1.5">
                <Download size={15} /> {downloading ? 'Generating...' : 'Download PDF'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Invoice Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Invoice No', value: inv.invoice_number },
          { label: 'Date', value: editMode ? invoiceDate : inv.invoice_date },
          { label: 'Original Amount', value: formatCurrency(displayOriginal) },
          { label: 'Grand Total', value: formatCurrency(displayGrandTotal) },
        ].map(s => (
          <div key={s.label} className="card">
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{s.label}</p>
            <p className="text-sm font-bold mt-1" style={{ color: 'var(--foreground)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Edit Form (shown only in edit mode) */}
      {editMode && (
        <div className="card space-y-5" style={{ border: '2px solid var(--primary)' }}>
          <h3 className="font-bold text-base" style={{ color: 'var(--foreground)' }}>✏️ Editing Invoice — {inv.invoice_number}</h3>
          <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            ⚠️ Invoice number <strong>{inv.invoice_number}</strong> is immutable and cannot be changed.
          </p>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Left column */}
            <div className="space-y-4">
              {/* Customer */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>👤 Customer Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label>Customer Name *</label><input value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
                  <div><label>Phone</label><input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /></div>
                  <div><label>Email</label><input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} /></div>
                  <div><label>Address</label><input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} /></div>
                </div>
              </div>

              {/* Trip */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>🚗 Trip Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label>Journey Date</label><input type="date" value={journeyDate} onChange={e => setJourneyDate(e.target.value)} /></div>
                  <div><label>Journey Time</label><input type="time" value={journeyTime} onChange={e => setJourneyTime(e.target.value)} /></div>
                  <div><label>Pickup Address</label><input value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} /></div>
                  <div><label>Drop Address</label><input value={dropAddress} onChange={e => setDropAddress(e.target.value)} /></div>
                  <div>
                    <label>Vehicle</label>
                    <input value={vehicleName} onChange={e => setVehicleName(e.target.value)} list="edit-vehicle-list" />
                    <datalist id="edit-vehicle-list">
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

              {/* Invoice Date */}
              <div>
                <label>📅 Invoice Date</label>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={{ maxWidth: 200 }} />
              </div>
            </div>

            {/* Right column — Amounts */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>💰 Fare & GST</h4>

              <div><label>Booking Amount (₹) *</label>
                <input type="number" min="0" value={originalAmount || ''} onChange={e => setOriginalAmount(Number(e.target.value))} /></div>

              <div><label>Discount Type</label>
                <select value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                  <option value="none">No Discount</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select></div>

              {discountType !== 'none' && (
                <div><label>{discountType === 'percentage' ? 'Discount %' : 'Discount ₹'}</label>
                  <input type="number" min="0" value={discountValue || ''} onChange={e => setDiscountValue(Number(e.target.value))} /></div>
              )}

              {/* GST Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: gstApplicable ? '#f0fdf4' : 'var(--muted)', border: gstApplicable ? '1px solid #bbf7d0' : 'none' }}>
                <div>
                  <p className="text-sm font-semibold">Apply GST</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {gstApplicable ? 'GST Invoice' : 'Non-GST Invoice'} · Note: invoice number series cannot be changed
                  </p>
                </div>
                <button onClick={() => setGstApplicable(!gstApplicable)}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ background: gstApplicable ? '#16a34a' : 'var(--border)' }}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${gstApplicable ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {gstApplicable && (
                <div><label>GST Rate (%)</label>
                  <select value={gstRate} onChange={e => setGstRate(Number(e.target.value))}>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (Standard)</option>
                    <option value={28}>28%</option>
                  </select></div>
              )}

              {/* Live amount summary */}
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="flex justify-between px-4 py-2 text-sm" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Booking Amount</span>
                  <span className="font-semibold">{formatCurrency(displayOriginal)}</span>
                </div>
                {displayDiscAmt > 0 && (
                  <div className="flex justify-between px-4 py-2 text-sm text-green-600" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span>Discount</span><span className="font-semibold">− {formatCurrency(displayDiscAmt)}</span>
                  </div>
                )}
                {displayGstApplicable && displayGstAmount > 0 && (
                  <div className="flex justify-between px-4 py-2 text-sm" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>GST ({displayGstRate}%)</span>
                    <span className="font-semibold">+ {formatCurrency(displayGstAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 font-bold text-base"
                  style={{ background: displayGstApplicable ? '#16a34a' : 'var(--primary)', color: 'white' }}>
                  <span>Grand Total</span><span>{formatCurrency(displayGrandTotal)}</span>
                </div>
              </div>

              <div><label>Payment Note</label>
                <input value={paymentNote} onChange={e => setPaymentNote(e.target.value)} /></div>

              <div><label>📝 Internal Notes (not on PDF)</label>
                <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></div>
            </div>
          </div>
        </div>
      )}

      {/* Full Invoice Preview */}
      <div>
        <p className="text-sm mb-4 text-center" style={{ color: 'var(--muted-foreground)' }}>
          {editMode ? 'Live preview updates as you edit — save when satisfied' : 'Full invoice preview — click "Download PDF" to save'}
        </p>
        <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
          <InvoiceTemplate data={buildInvoiceData(previewInv)} />
        </div>
      </div>
    </div>
  )
}
