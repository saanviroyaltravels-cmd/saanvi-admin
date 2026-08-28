-- ============================================================
-- SAANVI ROYAL TRAVELS — INVOICE SYSTEM MIGRATION
-- Safe: CREATE IF NOT EXISTS + ON CONFLICT DO NOTHING
-- Run this in Supabase SQL Editor
-- Does NOT modify any existing table
-- ============================================================

-- ============================================================
-- 1. Create invoices table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  booking_id TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Customer snapshot (immutable record)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,

  -- Trip snapshot
  pickup_address TEXT,
  drop_address TEXT,
  vehicle_name TEXT,
  trip_type TEXT,
  journey_date TEXT,
  journey_time TEXT,

  -- Amounts
  original_amount NUMERIC NOT NULL DEFAULT 0,
  discount_type TEXT DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'fixed')),
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  final_amount NUMERIC NOT NULL DEFAULT 0,

  -- GST
  gst_applicable BOOLEAN DEFAULT false,
  gst_rate NUMERIC DEFAULT 18,
  gst_amount NUMERIC DEFAULT 0,

  -- Company snapshot at time of creation
  company_name TEXT DEFAULT 'Saanvi Royal Travels',
  company_address TEXT DEFAULT 'Karnpura, Tarwara, Siwan, Bihar 841226',
  company_phone TEXT DEFAULT '+91 9229764300',
  company_whatsapp TEXT DEFAULT '+91 9939814111',
  company_email TEXT DEFAULT 'saanviroyaltravels@gmail.com',
  gstin TEXT DEFAULT '10GXCPK1034H1Z3',
  udyam TEXT DEFAULT 'UDYAM-BR-35-0015333',

  -- Special offer snapshot (captured at generation time)
  offer_title TEXT,
  offer_description TEXT,
  offer_promo_code TEXT,
  offer_valid_until TEXT,

  -- Payment
  payment_qr_url TEXT,
  payment_note TEXT,
  payment_status TEXT DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Paid', 'Partial')),

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

-- ============================================================
-- 2. Enable RLS (admin-only access)
-- ============================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (admins) can access invoices
DROP POLICY IF EXISTS "Admin read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admin insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admin update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admin delete invoices" ON public.invoices;

CREATE POLICY "Admin read invoices"   ON public.invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin insert invoices" ON public.invoices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin update invoices" ON public.invoices FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin delete invoices" ON public.invoices FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- 3. Add invoice-specific site_settings keys
-- (safe: ON CONFLICT DO NOTHING)
-- ============================================================

INSERT INTO public.site_settings (setting_key, setting_value, setting_type, category, description)
VALUES
  ('gstin',          '10GXCPK1034H1Z3',   'text', 'invoice', 'GST Identification Number'),
  ('udyam',          'UDYAM-BR-35-0015333','text', 'invoice', 'Udyam Registration Number'),
  ('payment_qr_url', '',                   'url',  'invoice', 'Payment QR code image URL (configured by admin)'),
  ('invoice_terms',  'Thank you for choosing Saanvi Royal Travels. We look forward to serving you again!', 'text', 'invoice', 'Invoice footer thank-you message')
ON CONFLICT (setting_key) DO NOTHING;

-- Also correct the phone/email in site_settings if still old values
UPDATE public.site_settings
SET setting_value = '+91 9229764300', updated_at = NOW()
WHERE setting_key = 'phone' AND setting_value = '+91 98765 43210';

UPDATE public.site_settings
SET setting_value = '+91 9939814111', updated_at = NOW()
WHERE setting_key = 'whatsapp' AND (setting_value = '+91 9876543210' OR setting_value = '+91 98765 43210');

UPDATE public.site_settings
SET setting_value = 'saanviroyaltravels@gmail.com', updated_at = NOW()
WHERE setting_key = 'email' AND setting_value = 'info@saanviroyaltravels.com';

UPDATE public.site_settings
SET setting_value = 'Karnpura, Tarwara, Siwan, Bihar 841226', updated_at = NOW()
WHERE setting_key = 'office_address' AND setting_value = 'Siwan, Bihar, India';

-- ============================================================
-- 4. Auto-update updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_invoice_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoices_updated_at ON public.invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_updated_at();
