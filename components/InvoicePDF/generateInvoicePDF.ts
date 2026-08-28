/**
 * generateInvoicePDF.ts
 * Client-side PDF generation using jsPDF + browser html2canvas.
 * Renders InvoiceTemplate to a canvas then embeds in A4 PDF.
 * ZERO impact on existing code.
 */

import type { InvoiceData } from './InvoiceTemplate'

export async function generateInvoicePDF(data: InvoiceData, filename?: string): Promise<void> {
  // Dynamically import to avoid SSR issues
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  // Render the invoice into a hidden off-screen container
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
    // Wait for render + images
    setTimeout(resolve, 600)
  })

  try {
    const canvas = await html2canvas(container, {
      scale: 2,              // High-res
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
    const imgHeight = pageWidth * canvasRatio

    if (imgHeight <= pageHeight) {
      // Fits on one page
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, imgHeight)
    } else {
      // Multi-page support
      let yOffset = 0
      let pageY = 0
      const sliceHeight = Math.floor(canvas.width * (pageHeight / pageWidth))

      while (yOffset < canvas.height) {
        const remaining = canvas.height - yOffset
        const slice = Math.min(sliceHeight, remaining)

        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = slice
        const ctx = sliceCanvas.getContext('2d')!
        ctx.drawImage(canvas, 0, yOffset, canvas.width, slice, 0, 0, canvas.width, slice)

        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95)
        const sliceImgHeight = pageWidth * (slice / canvas.width)

        if (pageY > 0) pdf.addPage()
        pdf.addImage(sliceData, 'JPEG', 0, 0, pageWidth, sliceImgHeight)

        yOffset += slice
        pageY++
      }
    }

    const outFilename = filename || `${data.invoiceNumber}-${data.customerName.replace(/\s+/g, '-')}.pdf`
    pdf.save(outFilename)

  } finally {
    root.unmount()
    document.body.removeChild(container)
  }
}
