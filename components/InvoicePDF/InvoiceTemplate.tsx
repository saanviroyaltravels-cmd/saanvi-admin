/**
 * InvoiceTemplate.tsx
 * Pure presentational component — renders a professional A4 travel invoice.
 * Used both for browser preview AND for PDF generation via html2canvas.
 * NO side effects, NO data fetching, NO state.
 * ZERO impact on existing pages.
 */

'use client'

export interface InvoiceData {
  // Invoice meta
  invoiceNumber: string
  invoiceDate: string
  paymentStatus: 'Unpaid' | 'Paid' | 'Partial'

  // Company
  companyName: string
  companyAddress: string
  companyPhone: string
  companyWhatsApp: string
  companyEmail: string
  gstin: string
  udyam: string
  logoUrl?: string

  // Customer
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerAddress?: string

  // Trip
  bookingId?: string
  journeyDate?: string
  journeyTime?: string
  pickupAddress?: string
  dropAddress?: string
  vehicleName?: string
  vehicleImageUrl?: string
  tripType?: string

  // Amounts
  originalAmount: number
  discountType: 'none' | 'percentage' | 'fixed'
  discountValue: number
  discountAmount: number
  finalAmount: number

  // GST
  gstApplicable: boolean
  gstRate: number
  gstAmount: number

  // Payment
  paymentQrUrl?: string
  paymentNote?: string

  // Offer
  offerTitle?: string
  offerDescription?: string
  offerPromoCode?: string
  offerValidUntil?: string

  // Terms
  invoiceTerms?: string
}

// ─── Helpers ────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n)
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: '3px 0', color: '#475569', fontSize: 12, width: '48%' }}>{label}</td>
      <td style={{ padding: '3px 8px', color: '#475569', fontSize: 12 }}>:</td>
      <td style={{ padding: '3px 0', color: '#0f172a', fontSize: 12, fontWeight: 600 }}>{value || '—'}</td>
    </tr>
  )
}

// ─── Main Component ──────────────────────────────────────────
interface InvoiceTemplateProps {
  data: InvoiceData
  /** When true, renders in print/PDF mode (no box-shadows, fixed px sizing) */
  printMode?: boolean
}

export default function InvoiceTemplate({ data, printMode = false }: InvoiceTemplateProps) {
  const hasOffer = Boolean(data.offerTitle || data.offerPromoCode)

  const discountLabel =
    data.discountType === 'percentage'
      ? `Discount (${data.discountValue}%)`
      : data.discountType === 'fixed'
      ? 'Discount (Fixed)'
      : 'Discount'

  // ─── Styles ─────────────────────────────────────────────────
  const page: React.CSSProperties = {
    width: 794,                // A4 @ 96dpi
    minHeight: 1123,
    backgroundColor: '#ffffff',
    fontFamily: '"Segoe UI", -apple-system, Arial, sans-serif',
    color: '#0f172a',
    position: 'relative',
    boxSizing: 'border-box',
    ...(printMode ? {} : { boxShadow: '0 4px 32px rgba(0,0,0,0.12)', borderRadius: 8, margin: '0 auto' }),
  }

  const header: React.CSSProperties = {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 60%, #b45309 100%)',
    padding: '16px 28px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }

  const sectionTitle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#1e3a8a',
    borderBottom: '2px solid #1e40af',
    paddingBottom: 3,
    marginBottom: 8,
  }

  const amountRow: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    fontSize: 13,
    borderBottom: '1px solid #f1f5f9',
  }

  const totalRow: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 14px',
    background: 'linear-gradient(90deg, #1e3a8a, #1e40af)',
    color: 'white',
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 700,
    marginTop: 6,
  }

  return (
    <div style={page} id="invoice-print-area">

      {/* ═══ HEADER ═══════════════════════════════════════════════ */}
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Logo */}
          <div style={{ width: 56, height: 56, background: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            <img
              src={data.logoUrl || '/logo.png'}
              alt={data.companyName}
              style={{ width: 50, height: 50, objectFit: 'contain' }}
              crossOrigin="anonymous"
            />
          </div>
          <div>
            <div style={{
              fontSize: 20, fontWeight: 900, color: '#ffffff',
              letterSpacing: '0.02em', lineHeight: 1.15,
              textTransform: 'uppercase',
            }}>
              {data.companyName}
            </div>
            <div style={{ fontSize: 10, color: '#bfdbfe', marginTop: 2 }}>
              {data.companyAddress}
            </div>
            <div style={{ fontSize: 10, color: '#bfdbfe', marginTop: 2 }}>
              📞 {data.companyPhone} &nbsp;|&nbsp; ✉ {data.companyEmail}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 6, padding: '3px 12px',
            fontSize: 11, fontWeight: 800, color: '#ffffff',
            letterSpacing: '0.08em', marginBottom: 4,
          }}>
            TAX INVOICE
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em' }}>
            #{data.invoiceNumber}
          </div>
          <div style={{ fontSize: 11, color: '#bfdbfe', marginTop: 2 }}>
            Date: <span style={{ color: '#ffffff', fontWeight: 600 }}>{data.invoiceDate}</span>
          </div>
          {data.paymentStatus && (
            <div style={{ marginTop: 4 }}>
              <span style={{
                background: data.paymentStatus === 'Paid' ? '#065f46' : data.paymentStatus === 'Partial' ? '#92400e' : '#991b1b',
                color: 'white', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em'
              }}>
                {data.paymentStatus.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ COMPANY + CUSTOMER ═══════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '1px solid #e2e8f0' }}>

        {/* Company Details */}
        <div style={{ padding: '12px 20px 10px 28px', borderRight: '1px solid #e2e8f0' }}>
          <div style={sectionTitle}>Company Details</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <Row label="GSTIN" value={data.gstin} />
              <Row label="Udyam Reg." value={data.udyam} />
              <Row label="Phone" value={data.companyPhone} />
              <Row label="WhatsApp" value={data.companyWhatsApp} />
              <Row label="Email" value={data.companyEmail} />
            </tbody>
          </table>
        </div>

        {/* Customer Details */}
        <div style={{ padding: '12px 28px 10px 20px', background: '#f8fafc' }}>
          <div style={sectionTitle}>Billed To</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            {data.customerName}
          </div>
          {data.customerPhone && (
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>📞 {data.customerPhone}</div>
          )}
          {data.customerEmail && (
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>✉ {data.customerEmail}</div>
          )}
          {data.customerAddress && (
            <div style={{ fontSize: 11, color: '#475569' }}>📍 {data.customerAddress}</div>
          )}
        </div>
      </div>

      {/* ═══ TRIP DETAILS + VEHICLE ═══════════════════════════════ */}
      <div style={{ padding: '12px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={sectionTitle}>Trip Details</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {data.bookingId && <Row label="Booking ID" value={data.bookingId} />}
              {data.journeyDate && <Row label="Journey Date" value={data.journeyDate} />}
              {data.journeyTime && <Row label="Journey Time" value={data.journeyTime} />}
              {data.pickupAddress && <Row label="Pickup" value={data.pickupAddress} />}
              {data.dropAddress && <Row label="Drop" value={data.dropAddress} />}
              {data.vehicleName && <Row label="Vehicle" value={data.vehicleName} />}
              {data.tripType && <Row label="Trip Type" value={data.tripType} />}
            </tbody>
          </table>
        </div>

        <div style={{ minWidth: 200 }} />
      </div>

      {/* ═══ FARE SUMMARY ════════════════════════════════════════ */}
      <div style={{ padding: '12px 28px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={sectionTitle}>Fare Summary</div>
        <div style={{ maxWidth: 420 }}>
          <div style={amountRow}>
            <span style={{ color: '#475569' }}>Booking Amount</span>
            <span style={{ fontWeight: 600 }}>{fmt(data.originalAmount)}</span>
          </div>
          {data.discountAmount > 0 && (
            <div style={{ ...amountRow, color: '#16a34a' }}>
              <span>{discountLabel}</span>
              <span style={{ fontWeight: 600 }}>− {fmt(data.discountAmount)}</span>
            </div>
          )}
          {data.gstApplicable && data.gstAmount > 0 && (
            <div style={amountRow}>
              <span style={{ color: '#475569' }}>GST ({data.gstRate}%)</span>
              <span style={{ fontWeight: 600 }}>+ {fmt(data.gstAmount)}</span>
            </div>
          )}
          <div style={{ borderTop: '2px dashed #cbd5e1', marginTop: 6, paddingTop: 6 }} />
          <div style={totalRow}>
            <span>GRAND TOTAL</span>
            <span>{fmt(data.finalAmount + (data.gstApplicable ? data.gstAmount : 0))}</span>
          </div>
        </div>
      </div>

      {/* ═══ GST INFORMATION ════════════════════════════════════ */}
      <div style={{ padding: '10px 28px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: 36, alignItems: 'center' }}>
        <div>
          <div style={sectionTitle}>GST Information</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: data.gstApplicable ? '#16a34a' : '#dc2626', marginBottom: 4 }}>
            GST: {data.gstApplicable ? `Applicable @ ${data.gstRate}%` : 'Not Charged'}
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#475569' }}>
          <div>GSTIN: <span style={{ fontWeight: 700, color: '#0f172a' }}>{data.gstin}</span></div>
          <div style={{ marginTop: 2 }}>Udyam: <span style={{ fontWeight: 700, color: '#0f172a' }}>{data.udyam}</span></div>
        </div>
      </div>

      {/* ═══ PAYMENT QR ══════════════════════════════════════════ */}
      <div style={{ padding: '12px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 20, background: '#fafbfc' }}>
        <div style={{ flex: 1 }}>
          <div style={sectionTitle}>Scan &amp; Pay</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 2, letterSpacing: '0.02em' }}>
            SAANVI ENTERPRISES
          </div>
          <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 700, marginBottom: 4 }}>
            UPI ID: <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#e0e7ff', padding: '2px 5px', borderRadius: 4, color: '#1e3a8a' }}>41212980663@sbi</span>
          </div>
          <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.5 }}>
            {data.paymentNote || 'Scan with any UPI App (GPay, PhonePe, Paytm, BHIM, Yono SBI) for instant payment.'}
            <br />
            <strong>WhatsApp:</strong> {data.companyWhatsApp}
          </div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: 6, display: 'inline-block', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <img
              src={data.paymentQrUrl || '/sbi-payment-qr.png'}
              alt="SBI Payment QR - SAANVI ENTERPRISES"
              style={{ width: 95, height: 95, objectFit: 'contain', borderRadius: 4, display: 'block' }}
              crossOrigin="anonymous"
            />
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#1e3a8a', marginTop: 3, letterSpacing: '0.04em' }}>SCAN TO PAY (UPI)</div>
        </div>
      </div>

      {/* ═══ TERMS ══════════════════════════════════════════════ */}
      <div style={{ padding: '10px 28px', borderBottom: hasOffer ? '1px solid #e2e8f0' : 'none', background: '#eff6ff', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#1e40af', fontStyle: 'italic' }}>
          {data.invoiceTerms || 'Thank you for choosing Saanvi Royal Travels. We look forward to serving you again!'}
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
          For queries: {data.companyPhone} | {data.companyEmail}
        </div>
      </div>

      {/* ═══ SPECIAL OFFER (only if active offer exists) ════════ */}
      {hasOffer && (
        <div style={{
          margin: '0 28px 8px', borderRadius: 6,
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 40%, #fbbf24 100%)',
          border: '1.5px solid #d97706',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 6,
        }}>
          <div style={{ fontSize: 22 }}>🚗</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e', letterSpacing: '0.03em' }}>
              ✦ SPECIAL OFFER — {data.offerTitle || 'Book Again & Save!'}
            </div>
            {data.offerDescription && (
              <div style={{ fontSize: 10, color: '#78350f', marginTop: 2 }}>{data.offerDescription}</div>
            )}
            {data.offerValidUntil && (
              <div style={{ fontSize: 9, color: '#92400e', marginTop: 1 }}>Valid until: {data.offerValidUntil}</div>
            )}
          </div>
          {data.offerPromoCode && (
            <div style={{ textAlign: 'center', background: '#fff', border: '1.5px dashed #d97706', borderRadius: 5, padding: '4px 10px' }}>
              <div style={{ fontSize: 8, color: '#92400e', fontWeight: 700, letterSpacing: '0.05em' }}>PROMO CODE</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#b45309', letterSpacing: '0.08em' }}>{data.offerPromoCode}</div>
              <div style={{ fontSize: 8, color: '#78350f' }}>Terms Apply</div>
            </div>
          )}
        </div>
      )}

      {/* ═══ FOOTER BAR ══════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
        padding: '10px 28px',
        textAlign: 'center',
        color: '#bfdbfe',
        fontSize: 10,
        letterSpacing: '0.04em',
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 12 }}>
          ✈ Thank you for choosing {data.companyName}
        </span>
        <span style={{ marginLeft: 14, opacity: 0.7 }}>|</span>
        <span style={{ marginLeft: 14 }}>Safe &amp; comfortable travel is our promise</span>
      </div>

    </div>
  )
}
