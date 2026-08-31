import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function getInitials(name: string) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
}

export function normalizeIndianMobile(mobile: string | null | undefined): string | null {
  if (!mobile) return null
  const digits = String(mobile).replace(/\D/g, '')
  if (digits.length === 10) {
    return `91${digits}`
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return digits
  }
  return null
}

export function formatWhatsAppBookingMessage(booking: any): string {
  if (!booking) return ''
  const customerName = booking.customer_name?.trim() || 'Customer'
  const bookingNumber = booking.booking_number || 'N/A'
  const serviceType = (booking.booking_type || 'Cab Service').replace(/_/g, ' ')
  const pickup = booking.pickup_address || booking.from_location || '—'
  const destination = booking.destination || booking.to_location || booking.package_name || '—'
  
  let travelDate = '—'
  if (booking.travel_date) {
    try {
      travelDate = formatDate(booking.travel_date)
    } catch {
      travelDate = String(booking.travel_date)
    }
  } else if (booking.created_at) {
    try {
      travelDate = formatDate(booking.created_at)
    } catch {
      travelDate = String(booking.created_at)
    }
  }

  const travelTime = booking.pickup_time || booking.travel_time || ''
  const vehicle = booking.vehicle_type || booking.vehicle || ''
  const fareVal = booking.total_amount || booking.fare || 0
  const amount = fareVal ? formatCurrency(fareVal) : '₹0'
  const rawStatus = booking.status || 'Pending'
  const normalizedStatus = String(rawStatus).trim().toLowerCase()
  const offersUrl = 'https://saanvitravel.com/special-offers'

  const detailsBlock = [
    `📋 Booking ID: ${bookingNumber}`,
    `🚕 Service: ${serviceType}`,
    `📍 Pickup: ${pickup}`,
    `📍 Destination: ${destination}`,
    `📅 Date: ${travelDate}`,
    travelTime ? `🕐 Time: ${travelTime}` : null,
    vehicle ? `🚗 Vehicle: ${vehicle}` : null,
    `💰 Total Fare: ${amount}`,
    `📌 Status: ${rawStatus}`
  ].filter(Boolean).join('\n')

  if (normalizedStatus === 'confirmed') {
    return `Namaste ${customerName} ji 🙏

Good news! Aapki Saanvi Royal Travels booking confirm ho gayi hai. 🎉

Yeh aapki confirmed booking details hain:

${detailsBlock}

Aapki booking ab confirm hai.

Travel ke din hamari team/driver aapse required coordination ke liye contact karegi.

Agar aapko kisi bhi tarah ki assistance chahiye, to humein WhatsApp par message karein.

Saanvi Royal Travels ke saath booking karne ke liye dhanyavaad! 🙏

📞 +91 9229764300

⭐ Special Offers:
${offersUrl}`
  }

  if (normalizedStatus === 'completed') {
    return `Namaste ${customerName} ji 🙏

Saanvi Royal Travels ke saath aapki journey complete ho gayi hai. 😊

Humein umeed hai ki aapka travel experience achha raha.

${detailsBlock}

Saanvi Royal Travels ko choose karne ke liye dil se dhanyavaad! 🙏

Aapka feedback aur future bookings hamare liye bahut important hain.

📞 +91 9229764300

⭐ Hamare latest Special Offers dekhein:
${offersUrl}`
  }

  if (normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
    return `Namaste ${customerName} ji,

Aapki Saanvi Royal Travels booking cancel kar di gayi hai.

${detailsBlock}

Agar aapne booking cancel nahi ki thi ya aapko kisi bhi assistance ki zarurat hai, to please humein WhatsApp par message karein.

Hamari team aapki help karne ke liye available hai.

Dhanyavaad,
Saanvi Royal Travels

📞 +91 9229764300

⭐ Future booking aur Special Offers:
${offersUrl}`
  }

  // Default / Pending Template
  return `Namaste ${customerName} ji 🙏

Saanvi Royal Travels mein aapka swagat hai!

Aapki booking request humein successfully mil gayi hai.

${detailsBlock}

Booking confirmation ke liye hamari team aapse jaldi contact karegi.

Agar booking mein koi change ya assistance chahiye, to humein WhatsApp par message karein.

Dhanyavaad! 🙏

Saanvi Royal Travels
📞 +91 9229764300

⭐ Special Offers:
${offersUrl}`
}

export function getWhatsAppBookingUrl(booking: any): string | null {
  const phone = normalizeIndianMobile(booking?.customer_mobile)
  if (!phone) return null
  const message = formatWhatsAppBookingMessage(booking)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}


