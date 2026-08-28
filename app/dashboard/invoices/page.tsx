'use client'
/**
 * /dashboard/invoices/page.tsx
 * Invoice History Dashboard.
 * NEW FILE — does not modify any existing page.
 */
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { FileText, Plus, Download, Eye, Trash2, Search, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { generateInvoicePDF } from '@/components/InvoicePDF/generateInvoicePDF'
import type { InvoiceData } from '@/components/InvoicePDF/InvoiceTemplate'

const PAYMENT_STATUSES = ['All', 'Unpaid', 'Paid', 'Partial']

function statusColor(s: string) {
  if (s === 'Paid') return { background: '#d1fae5', color: '#065f46' }
  if (s === 'Partial') return { background: '#fef3c7', color: '#92400e' }
  return { background: '#fee2e2', color: '#991b1b' }
}

export default function InvoicesPage() {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [payFilter, setPayFilter] = useState('All')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Failed to load invoices')
    setInvoices(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    const matchSearch =
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.customer_name?.toLowerCase().includes(q) ||
      inv.customer_phone?.includes(q) ||
      inv.booking_id?.toLowerCase().includes(q)
    const matchPay = payFilter === 'All' || inv.payment_status === payFilter
    return matchSearch && matchPay
  })

  async function handleDownload(inv: any) {
    setDownloading(inv.id)
    try {
      const data: InvoiceData = {
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        paymentStatus: inv.payment_status,
        companyName: inv.company_name || 'Saanvi Royal Travels',
        companyAddress: inv.company_address || 'Karnpura, Tarwara, Siwan, Bihar 841226',
        companyPhone: inv.company_phone || '+91 9229764300',
        companyWhatsApp: inv.company_whatsapp || '+91 9939814111',
        companyEmail: inv.company_email || 'saanviroyaltravels@gmail.com',
        gstin: inv.gstin || '10GXCPK1034H1Z3',
        udyam: inv.udyam || 'UDYAM-BR-35-0015333',
        customerName: inv.customer_name,
        customerPhone: inv.customer_phone,
        customerEmail: inv.customer_email,
        customerAddress: inv.customer_address,
        bookingId: inv.booking_id,
        journeyDate: inv.journey_date,
        journeyTime: inv.journey_time,
        pickupAddress: inv.pickup_address,
        dropAddress: inv.drop_address,
        vehicleName: inv.vehicle_name,
        tripType: inv.trip_type,
        originalAmount: inv.original_amount,
        discountType: inv.discount_type || 'none',
        discountValue: inv.discount_value || 0,
        discountAmount: inv.discount_amount || 0,
        finalAmount: inv.final_amount,
        gstApplicable: inv.gst_applicable || false,
        gstRate: inv.gst_rate || 18,
        gstAmount: inv.gst_amount || 0,
        paymentQrUrl: inv.payment_qr_url,
        paymentNote: inv.payment_note,
        offerTitle: inv.offer_title,
        offerDescription: inv.offer_description,
        offerPromoCode: inv.offer_promo_code,
        offerValidUntil: inv.offer_valid_until,
        invoiceTerms: inv.invoice_terms,
      }
      await generateInvoicePDF(data)
      toast.success('PDF downloaded!')
    } catch (e: any) {
      toast.error('PDF generation failed: ' + e.message)
    } finally {
      setDownloading(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    setDeleting(id)
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) toast.error('Delete failed')
    else { toast.success('Invoice deleted'); load() }
    setDeleting(null)
  }

  async function updatePayStatus(id: string, status: string) {
    await supabase.from('invoices').update({ payment_status: status }).eq('id', id)
    toast.success('Payment status updated')
    load()
  }

  // Stats
  const totalAmt = invoices.reduce((s, i) => s + (i.final_amount || 0), 0)
  const paidAmt = invoices.filter(i => i.payment_status === 'Paid').reduce((s, i) => s + (i.final_amount || 0), 0)
  const pendingAmt = invoices.filter(i => i.payment_status === 'Unpaid').reduce((s, i) => s + (i.final_amount || 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Invoice Management</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{invoices.length} total invoices</p>
        </div>
        <Link href="/dashboard/invoices/new" className="btn-primary">
          <Plus size={16} /> New Invoice
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Invoiced', value: formatCurrency(totalAmt), icon: '📋', color: '#1e40af' },
          { label: 'Collected', value: formatCurrency(paidAmt), icon: '✅', color: '#16a34a' },
          { label: 'Pending', value: formatCurrency(pendingAmt), icon: '⏳', color: '#dc2626' },
        ].map(s => (
          <div key={s.label} className="card" style={{ borderLeft: `4px solid ${s.color}` }}>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              <div>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{s.label}</p>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input
            placeholder="Search by invoice no, customer, booking ID..."
            value={search} onChange={e => setSearch(e.target.value)} className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {PAYMENT_STATUSES.map(s => (
            <button key={s} onClick={() => setPayFilter(s)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: payFilter === s ? 'var(--primary)' : 'var(--muted)', color: payFilter === s ? 'white' : 'var(--muted-foreground)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Booking</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <p className="font-mono text-xs font-bold text-blue-600">{inv.invoice_number}</p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{inv.vehicle_name || '—'}</p>
                    </td>
                    <td>
                      <p className="font-medium text-sm">{inv.customer_name}</p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{inv.customer_phone}</p>
                    </td>
                    <td className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{inv.booking_id || '—'}</td>
                    <td className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{inv.invoice_date}</td>
                    <td className="font-semibold text-sm">{formatCurrency(inv.final_amount || 0)}</td>
                    <td>
                      <div className="relative">
                        <select
                          value={inv.payment_status}
                          onChange={e => updatePayStatus(inv.id, e.target.value)}
                          style={{ ...statusColor(inv.payment_status), border: 'none', borderRadius: 99, padding: '3px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: 'auto' }}
                        >
                          <option value="Unpaid">Unpaid</option>
                          <option value="Paid">Paid</option>
                          <option value="Partial">Partial</option>
                        </select>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/invoices/${inv.id}`}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition"
                          title="View Invoice">
                          <Eye size={15} />
                        </Link>
                        <button
                          onClick={() => handleDownload(inv)}
                          disabled={downloading === inv.id}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition disabled:opacity-50"
                          title="Download PDF">
                          {downloading === inv.id
                            ? <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full spinner" />
                            : <Download size={15} />}
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          disabled={deleting === inv.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition disabled:opacity-50"
                          title="Delete Invoice">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="text-center py-16" style={{ color: 'var(--muted-foreground)' }}>
                      <div className="text-4xl mb-3">📄</div>
                      <p className="font-medium">No invoices found</p>
                      <p className="text-xs mt-1">Create your first invoice using the "New Invoice" button above</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
