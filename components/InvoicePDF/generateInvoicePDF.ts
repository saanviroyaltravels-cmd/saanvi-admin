/**
 * generateInvoicePDF.ts
 * Client-side PDF generation using jsPDF + browser html2canvas.
 * Renders InvoiceTemplate to a canvas and saves as a crisp 1-page A4 PDF.
 * ZERO impact on existing code.
 */

import type { InvoiceData } from './InvoiceTemplate'

export async function generateInvoicePDF(data: InvoiceData, filename?: string): Promise<void> {
  // Dynamically import to avoid SSR issues
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

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
    root.render(createElement(InvoiceTemplate, { data, printMode: true }))
    // Wait for render + image assets
    setTimeout(resolve, 500)
  })

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
    if (imgHeight > pageHeight) {
      const scaleFactor = pageHeight / imgHeight
      const renderWidth = pageWidth * scaleFactor
      const renderHeight = pageHeight
      const xOffset = (pageWidth - renderWidth) / 2
      pdf.addImage(imgData, 'JPEG', xOffset, 0, renderWidth, renderHeight)
    } else {
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, imgHeight)
    }

    const outFilename = filename || `${data.invoiceNumber.replace(/\//g, '-')}-${(data.customerName || 'customer').replace(/\s+/g, '-')}.pdf`
    pdf.save(outFilename)

  } finally {
    root.unmount()
    document.body.removeChild(container)
  }
}
