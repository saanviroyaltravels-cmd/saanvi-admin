import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const row = body?.booking || body;

    if (!row || typeof row !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Valid booking row payload is required.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oyfahfvudhhwitxjedrd.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZmFoZnZ1ZGhod2l0eGplZHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjQxOTIsImV4cCI6MjA5ODQwMDE5Mn0.pyFfVB0nTwViF6jv_uZwjM0CEbV74kp125bYxcIvDIE';

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.from('bookings').insert(row).select().single();

    if (error) {
      console.error('[create-booking] Supabase insert error:', error);
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Booking created successfully in database.', booking: data },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[create-booking] Route exception:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
