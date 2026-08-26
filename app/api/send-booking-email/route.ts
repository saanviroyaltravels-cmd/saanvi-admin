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

    // Build email content
    const rawType = (booking.type || booking.booking_type || booking.service_type || '').toLowerCase();
    let typeName = 'Cab Booking';
    if (rawType.includes('airport') || rawType.includes('railway') || rawType.includes('station')) typeName = 'Airport / Railway Transfer';
    else if (rawType.includes('package') || rawType === 'pkg') typeName = 'Tour Package Booking';
    else if (rawType.includes('custom') || rawType === 'custom_trip') typeName = 'Custom Package (Apna Tour Banaye)';
    else if (rawType.includes('local') || rawType.includes('rental') || rawType.includes('taxi')) typeName = 'Local City Taxi / Rental';
    else if (rawType.includes('outstation') || rawType.includes('cab') || rawType.includes('round') || rawType.includes('oneway')) typeName = 'Outstation Cab Booking';
    else if (rawType.includes('enquiry') || rawType.includes('contact')) typeName = 'Website Customer Enquiry';

    const customerName = booking.name || booking.customer_name || 'Customer';
    const customerPhone = booking.mobile || booking.customer_mobile || booking.customer_phone || 'N/A';
    const pickup = booking.pickup || booking.pickup_address || booking.pickupAddress || '';
    const drop = booking.destination || booking.dest || booking.drop_address || booking.dropAddress || '';
    const travelDate = booking.date || booking.travel_date || booking.travelDate || '';
    const totalFare = booking.total_fare || booking.total_amount || booking.fare || null;

    const subject = `[New ${typeName}] ${bookingId ? '#' + bookingId + ' ' : ''}— ${customerName} (${pickup ? pickup.split(',')[0] : 'Siwan'}${drop ? ' ➔ ' + drop.split(',')[0] : ''})`;

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
