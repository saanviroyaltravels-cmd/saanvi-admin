/**
 * generateInvoicePDF.ts
 * Client-side PDF generation using jsPDF + browser html2canvas.
 * Renders InvoiceTemplate to a canvas and saves as a crisp 1-page A4 PDF.
 * ZERO impact on existing code.
 */

import type { InvoiceData } from './InvoiceTemplate'
import { DEFAULT_PAYMENT_QR_BASE64 } from './defaultPaymentQrBase64'

export async function generateInvoicePDF(data: InvoiceData, filename?: string): Promise<void> {
  // Dynamically import to avoid SSR issues
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  // Helper to ensure all image URLs (like payment QR or logo) are converted to data URIs
  async function toDataUrl(url: string): Promise<string> {
    if (!url || url.startsWith('data:')) return url
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch {
      return url
    }
  }

  // Pre-convert QR and logo to embedded data URIs if they are remote/relative URLs
  const resolvedPaymentQrUrl = data.paymentQrUrl
    ? (data.paymentQrUrl.startsWith('data:') ? data.paymentQrUrl : await toDataUrl(data.paymentQrUrl))
    : DEFAULT_PAYMENT_QR_BASE64

  const resolvedLogoUrl = data.logoUrl
    ? (data.logoUrl.startsWith('data:') ? data.logoUrl : await toDataUrl(data.logoUrl))
    : data.logoUrl

  const resolvedData: InvoiceData = {
    ...data,
    paymentQrUrl: resolvedPaymentQrUrl,
    logoUrl: resolvedLogoUrl,
  }

  // Render the invoice into a hidden off-screen container with fixed A4 dimensions
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 794px;
    background: white;
    z-index: -1;
  `
  document.body.appendChild(container)

  // Dynamically render React component into div
  const { createRoot } = await import('react-dom/client')
  const { createElement } = await import('react')
  const { default: InvoiceTemplate } = await import('./InvoiceTemplate')

  const root = createRoot(container)
  await new Promise<void>(resolve => {
    root.render(createElement(InvoiceTemplate, { data: resolvedData, printMode: true }))
    setTimeout(resolve, 200)
  })

  // Ensure all <img> tags (especially payment QR) in the container are fully loaded and decoded
  const images = Array.from(container.querySelectorAll('img'))
  await Promise.all(
    images.map(img => {
      if (img.complete && img.naturalWidth > 0) {
        return (img.decode ? img.decode() : Promise.resolve()).catch(() => {})
      }
      return new Promise<void>(resolve => {
        img.onload = () => {
          if (img.decode) {
            img.decode().then(resolve).catch(resolve)
          } else {
            resolve()
          }
        }
        img.onerror = () => resolve()
      })
    })
  )

  // Small buffer to guarantee canvas painting
  await new Promise(resolve => setTimeout(resolve, 150))

  // Measure the exact position of the QR code relative to container
  const qrElement = container.querySelector('#invoice-payment-qr-img') as HTMLImageElement | null
  let qrMetrics: { x: number; y: number; width: number; height: number } | null = null

  if (qrElement) {
    let curr: HTMLElement | null = qrElement
    let top = 0
    let left = 0
    while (curr && curr !== container) {
      top += curr.offsetTop || 0
      left += curr.offsetLeft || 0
      curr = curr.offsetParent as HTMLElement | null
    }

    qrMetrics = {
      x: left,
      y: top,
      width: qrElement.offsetWidth || 95,
      height: qrElement.offsetHeight || 95,
    }
  }

  try {
    const canvas = await html2canvas(container, {
      scale: 2,              // High-res retina scale
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.95)

    // A4 page: 210mm × 297mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = 210
    const pageHeight = 297

    const canvasRatio = canvas.height / canvas.width
    let imgHeight = pageWidth * canvasRatio

    // Fit-to-page protection: Ensure entire invoice fits onto exactly 1 page
    let effectiveScale = 1
    let xOffset = 0
    let renderWidth = pageWidth
    let renderHeight = imgHeight

    if (imgHeight > pageHeight) {
      effectiveScale = pageHeight / imgHeight
      renderWidth = pageWidth * effectiveScale
      renderHeight = pageHeight
      xOffset = (pageWidth - renderWidth) / 2
      pdf.addImage(imgData, 'JPEG', xOffset, 0, renderWidth, renderHeight)
    } else {
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, imgHeight)
    }

    // Direct QR Code Overlay into PDF:
    // Ensures that even if html2canvas skips/taints <img> elements during DOM capture,
    // the QR code image is 100% guaranteed to be sharp, visible, and placed at the exact pixel position.
    if (qrMetrics && resolvedPaymentQrUrl) {
      const containerWidthPx = 794
      // Convert pixel position from container coordinates to PDF mm coordinates
      const mmPerPx = (pageWidth / containerWidthPx) * effectiveScale
      const qrPdfX = xOffset + (qrMetrics.x * mmPerPx)
      const qrPdfY = qrMetrics.y * mmPerPx
      const qrPdfW = qrMetrics.width * mmPerPx
      const qrPdfH = qrMetrics.height * mmPerPx

      const qrFormat = resolvedPaymentQrUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'
      pdf.addImage(resolvedPaymentQrUrl, qrFormat, qrPdfX, qrPdfY, qrPdfW, qrPdfH)
    }

    const outFilename = filename || `${data.invoiceNumber.replace(/\//g, '-')}-${(data.customerName || 'customer').replace(/\s+/g, '-')}.pdf`
    pdf.save(outFilename)

  } finally {
    root.unmount()
    document.body.removeChild(container)
  }
}
