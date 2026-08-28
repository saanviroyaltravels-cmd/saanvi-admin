'use client'
/**
 * /dashboard/invoices/[id]/page.tsx
 * View / Re-download individual invoice.
 * NEW FILE — does not modify any existing page.
 */
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronLeft, Download } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { InvoiceData } from '@/components/InvoicePDF/InvoiceTemplate'

const InvoiceTemplate = dynamic(
  () => import('@/components/InvoicePDF/InvoiceTemplate'),
  { ssr: false, loading: () => <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" /></div> }
)

function statusColor(s: string): React.CSSProperties {
  if (s === 'Paid') return { background: '#d1fae5', color: '#065f46' }
  if (s === 'Partial') return { background: '#fef3c7', color: '#92400e' }
  return { background: '#fee2e2', color: '#991b1b' }
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const supabase = createClient()
  const [inv, setInv] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState('Unpaid')

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
      setPaymentStatus(data.payment_status)
      setLoading(false)
    }
    load()
  }, [params.id, supabase])

  async function updatePayStatus(status: string) {
    await supabase.from('invoices').update({ payment_status: status }).eq('id', params.id as string)
    setPaymentStatus(status)
    setInv((prev: any) => ({ ...prev, payment_status: status }))
    toast.success('Payment status updated')
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
      originalAmount: i.original_amount,
      discountType: i.discount_type || 'none',
      discountValue: i.discount_value || 0,
      discountAmount: i.discount_amount || 0,
      finalAmount: i.final_amount,
      gstApplicable: i.gst_applicable || false,
      gstRate: i.gst_rate || 18,
      gstAmount: i.gst_amount || 0,
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

  const invoiceData = buildInvoiceData({ ...inv, payment_status: paymentStatus })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices" className="btn-ghost p-2">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{inv.invoice_number}</h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{inv.customer_name} · {inv.invoice_date}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Payment status badge + update */}
          <select
            value={paymentStatus}
            onChange={e => updatePayStatus(e.target.value)}
            style={{ ...statusColor(paymentStatus), border: 'none', borderRadius: 99, padding: '6px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: 'auto' }}>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
          </select>
          <button onClick={handleDownload} disabled={downloading} className="btn-primary disabled:opacity-50">
            <Download size={15} /> {downloading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Invoice Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Invoice No', value: inv.invoice_number },
          { label: 'Date', value: inv.invoice_date },
          { label: 'Original Amount', value: `₹${(inv.original_amount || 0).toLocaleString('en-IN')}` },
          { label: 'Grand Total', value: `₹${((inv.final_amount || 0) + (inv.gst_applicable ? (inv.gst_amount || 0) : 0)).toLocaleString('en-IN')}` },
        ].map(s => (
          <div key={s.label} className="card">
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{s.label}</p>
            <p className="text-sm font-bold mt-1" style={{ color: 'var(--foreground)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Full Invoice Preview */}
      <div>
        <p className="text-sm mb-4 text-center" style={{ color: 'var(--muted-foreground)' }}>
          Full invoice preview — click "Download PDF" to save
        </p>
        <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
          <InvoiceTemplate data={invoiceData} />
        </div>
      </div>
    </div>
  )
}
