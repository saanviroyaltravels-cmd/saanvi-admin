import { NextRequest, NextResponse } from 'next/server';

// In-memory deduplication cache
const processedBookings = new Map<string, number>();
const DEDUP_TTL_MS = 60 * 60 * 1000; // 1 hour

function isDuplicate(id: string | null | undefined): boolean {
  if (!id) return false;
  const now = Date.now();
  const lastSeen = processedBookings.get(id);
  if (lastSeen && (now - lastSeen) < DEDUP_TTL_MS) {
    return true;
  }
  processedBookings.set(id, now);
  if (processedBookings.size > 500) {
    for (const [key, time] of processedBookings.entries()) {
      if (now - time > DEDUP_TTL_MS) processedBookings.delete(key);
    }
  }
  return false;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const booking = body?.booking;

    if (!booking || typeof booking !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Valid booking payload is required.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const bookingId = booking.id || booking.booking_id || booking.booking_number || booking.invoice_number;

    if (bookingId && isDuplicate(bookingId)) {
      return NextResponse.json(
        { success: true, message: 'Duplicate notification skipped (already processed).', bookingId },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.BOOKING_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'saanviroyaltravels@gmail.com';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Saanvi Royal Travels <onboarding@resend.dev>';

    // Dynamic Subject & Heading Resolver
    const rawType = (booking.type || booking.booking_type || booking.service_type || '').toLowerCase().trim();
    const customerName = booking.name || booking.customer_name || 'Customer';
    const customerPhone = booking.mobile || booking.customer_mobile || booking.customer_phone || 'N/A';
    const rawPickup = booking.pickup || booking.pickup_address || booking.pickupAddress || '';
    const rawDrop = booking.destination || booking.dest || booking.drop_address || booking.dropAddress || '';
    const pickup = rawPickup;
    const drop = rawDrop;
    const packageName = booking.package_name || booking.packageName || '';

    const cleanPickup = rawPickup ? rawPickup.split(',')[0].trim() : '';
    const cleanDrop = rawDrop ? rawDrop.split(',')[0].trim() : '';
    const cleanDest = cleanDrop || (packageName ? packageName.split(',')[0].trim() : '');

    const idTag = bookingId ? `#${bookingId} ` : '';

    let typeName = 'Cab Booking';
    let subject = '';

    // 1. Airport Pickup
    if (rawType === 'airport_pickup' || (rawType.includes('airport') && rawType.includes('pickup')) || rawType === 'airport pickup') {
      typeName = 'Airport Pickup';
      const route = (cleanPickup && cleanDrop) ? ` (${cleanPickup} → ${cleanDrop})` : (cleanPickup ? ` (${cleanPickup})` : (cleanDrop ? ` (${cleanDrop})` : ''));
      subject = `✈️ New Airport Pickup ${idTag}— ${customerName}${route}`.replace(/\s+/g, ' ').trim();
    }
    // 2. Airport Drop
    else if (rawType === 'airport_drop' || (rawType.includes('airport') && rawType.includes('drop')) || rawType === 'airport drop') {
      typeName = 'Airport Drop';
      const route = (cleanPickup && cleanDrop) ? ` (${cleanPickup} → ${cleanDrop})` : (cleanDrop ? ` (${cleanDrop})` : (cleanPickup ? ` (${cleanPickup})` : ''));
      subject = `✈️ New Airport Drop ${idTag}— ${customerName}${route}`.replace(/\s+/g, ' ').trim();
    }
    // 3. Railway Transfer
    else if (rawType === 'railway_pickup' || rawType === 'railway_drop' || rawType === 'railway_transfer' || rawType.includes('railway') || rawType.includes('train') || (rawType.includes('station') && !rawType.includes('outstation'))) {
      typeName = 'Railway Transfer';
      const route = (cleanPickup && cleanDrop) ? ` (${cleanPickup} → ${cleanDrop})` : (cleanDrop ? ` (${cleanDrop})` : (cleanPickup ? ` (${cleanPickup})` : ''));
      subject = `🚆 New Railway Transfer ${idTag}— ${customerName}${route}`.replace(/\s+/g, ' ').trim();
    }
    // 4. Tour Package
    else if (rawType === 'package' || rawType.includes('package') || rawType === 'pkg') {
      typeName = 'Tour Package Booking';
      const destTag = cleanDest ? ` (${cleanDest})` : '';
      subject = `📦 New Tour Package Booking ${idTag}— ${customerName}${destTag}`.replace(/\s+/g, ' ').trim();
    }
    // 5. Local Taxi / Rental
    else if (rawType === 'local_taxi' || rawType === 'local_rental' || rawType.includes('local') || rawType.includes('rental') || rawType === 'taxi') {
      typeName = 'Local Taxi Booking';
      const route = (cleanPickup && cleanDrop) ? ` (${cleanPickup} → ${cleanDrop})` : (cleanPickup ? ` (${cleanPickup})` : (cleanDrop ? ` (${cleanDrop})` : ''));
      subject = `🚖 New Local Taxi Booking ${idTag}— ${customerName}${route}`.replace(/\s+/g, ' ').trim();
    }
    // 6. Custom Tour (Apna Tour Banaye)
    else if (rawType === 'custom' || rawType === 'custom_trip' || rawType.includes('custom')) {
      typeName = 'Custom Tour Enquiry';
      subject = `🗺️ New Custom Tour Enquiry — ${customerName}`.replace(/\s+/g, ' ').trim();
    }
    // 7. General Contact Enquiry
    else if (rawType === 'enquiry' || rawType === 'contact' || rawType.includes('enquiry') || rawType.includes('contact')) {
      typeName = 'Website Customer Enquiry';
      subject = `📩 New Website Enquiry — ${customerName}`.replace(/\s+/g, ' ').trim();
    }
    // 8. Outstation / Cab Booking
    else if (rawType === 'outstation_cab' || rawType.includes('outstation') || rawType.includes('cab') || rawType === 'oneway' || rawType === 'round') {
      typeName = 'Cab Booking';
      const route = (cleanPickup && cleanDrop) ? ` (${cleanPickup} → ${cleanDrop})` : (cleanPickup ? ` (${cleanPickup})` : (cleanDrop ? ` (${cleanDrop})` : ''));
      subject = `🚕 New Cab Booking ${idTag}— ${customerName}${route}`.replace(/\s+/g, ' ').trim();
    }
    // Fallback
    else {
      typeName = 'Booking';
      const fallbackRoute = (cleanPickup && cleanDrop) ? ` (${cleanPickup} → ${cleanDrop})` : '';
      subject = `📋 New Booking ${idTag}— ${customerName}${fallbackRoute}`.replace(/\s+/g, ' ').trim();
    }

    const travelDate = booking.date || booking.travel_date || booking.travelDate || '';
    const totalFare = booking.total_fare || booking.total_amount || booking.fare || null;

    const items = [
      { label: 'Booking ID', value: bookingId || 'N/A' },
      { label: 'Booking Type', value: typeName },
      { label: 'Customer Name', value: customerName },
      { label: 'Mobile Number', value: customerPhone },
      pickup ? { label: 'Pickup Location', value: pickup } : null,
      drop ? { label: 'Drop Destination', value: drop } : null,
      travelDate ? { label: 'Travel Date', value: travelDate } : null,
      booking.vehicle || booking.vehicle_type ? { label: 'Vehicle', value: booking.vehicle || booking.vehicle_type } : null,
      totalFare !== null ? { label: 'Total Fare', value: '₹' + Number(totalFare).toLocaleString('en-IN') } : null,
      booking.notes || booking.message ? { label: 'Notes', value: booking.notes || booking.message } : null,
    ].filter(Boolean);

    const rowsHtml = items.map(item => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; width: 35%;">${item!.label}</td>
        <td style="padding: 10px 14px; font-size: 14px; color: #1e293b;">${String(item!.value).replace(/\n/g, '<br>')}</td>
      </tr>
    `).join('');

    const html = `
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; font-family: sans-serif;">
        <div style="background: #0f172a; padding: 20px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px;">🚖 Saanvi Royal Travels — New ${typeName}</h2>
        </div>
        <div style="padding: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>${rowsHtml}</tbody>
          </table>
          <div style="margin-top: 20px; text-align: center;">
            <a href="https://admin.saanvitravel.com" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">Open Admin Dashboard</a>
          </div>
        </div>
      </div>
    `;

    const text = items.map(i => `${i!.label}: ${i!.value}`).join('\n');

    if (!apiKey) {
      console.warn('[send-booking-email] RESEND_API_KEY not configured. Notification logged only.');
      return NextResponse.json(
        { success: false, warning: 'RESEND_API_KEY not configured.', bookingId, bookingType: typeName },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        subject,
        html,
        text,
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));
    return NextResponse.json(
      {
        success: resendRes.ok,
        message: resendRes.ok ? 'Admin notification sent.' : 'Resend API returned non-200',
        details: resendData,
        bookingId,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[send-booking-email] Route error:', err);
    return NextResponse.json(
      { success: false, warning: 'Failed to dispatch email notification.', error: err.message },
      { status: 200, headers: CORS_HEADERS }
    );
  }
}
