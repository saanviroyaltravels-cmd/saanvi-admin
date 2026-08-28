-- ============================================================
-- SAANVI ROYAL TRAVELS — INVOICE SYSTEM MIGRATION (v2 — FIXED)
-- Safe: CREATE IF NOT EXISTS + ON CONFLICT DO NOTHING
-- Run this in Supabase SQL Editor
-- Does NOT modify any existing table or constraint
-- Does NOT insert 'invoice' into site_settings.category
--   (site_settings_category_check only allows:
--    general, contact, social, seo, maintenance, notification)
-- ============================================================

-- ============================================================
-- 1. Create invoices table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  booking_id TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Customer snapshot (immutable record at generation time)
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

  -- Company details snapshot at time of creation
  company_name TEXT DEFAULT 'Saanvi Royal Travels',
  company_address TEXT DEFAULT 'Karnpura, Tarwara, Siwan, Bihar 841226',
  company_phone TEXT DEFAULT '+91 9229764300',
  company_whatsapp TEXT DEFAULT '+91 9939814111',
  company_email TEXT DEFAULT 'saanviroyaltravels@gmail.com',
  gstin TEXT DEFAULT '10GXCPK1034H1Z3',
  udyam TEXT DEFAULT 'UDYAM-BR-35-0015333',

  -- Special offer snapshot (captured at invoice generation time)
  offer_title TEXT,
  offer_description TEXT,
  offer_promo_code TEXT,
  offer_valid_until TEXT,

  -- Payment
  payment_qr_url TEXT,
  payment_note TEXT,
  payment_status TEXT DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Paid', 'Partial')),

  -- Invoice footer text
  invoice_terms TEXT,

  -- Internal notes (not shown on PDF)
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

-- ============================================================
-- 2. RLS: invoices — authenticated (admin) only
-- ============================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read invoices"   ON public.invoices;
DROP POLICY IF EXISTS "Admin insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admin update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admin delete invoices" ON public.invoices;

CREATE POLICY "Admin read invoices"
  ON public.invoices FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin update invoices"
  ON public.invoices FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin delete invoices"
  ON public.invoices FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- 3. Auto-update trigger for invoices.updated_at
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

-- ============================================================
-- 4. Separate invoice_settings table
--    (DOES NOT touch site_settings or its constraints)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'Saanvi Royal Travels',
  business_address TEXT NOT NULL DEFAULT 'Karnpura, Tarwara, Siwan, Bihar 841226',
  business_phone TEXT NOT NULL DEFAULT '+91 9229764300',
  business_whatsapp TEXT NOT NULL DEFAULT '+91 9939814111',
  business_email TEXT NOT NULL DEFAULT 'saanviroyaltravels@gmail.com',
  gstin TEXT NOT NULL DEFAULT '10GXCPK1034H1Z3',
  udyam TEXT NOT NULL DEFAULT 'UDYAM-BR-35-0015333',
  default_gst_applicable BOOLEAN NOT NULL DEFAULT false,
  default_gst_rate NUMERIC NOT NULL DEFAULT 18,
  payment_qr_url TEXT DEFAULT '',
  invoice_terms TEXT DEFAULT 'Thank you for choosing Saanvi Royal Travels. We look forward to serving you again!',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. RLS: invoice_settings — authenticated only
-- ============================================================

ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read invoice_settings"   ON public.invoice_settings;
DROP POLICY IF EXISTS "Admin insert invoice_settings" ON public.invoice_settings;
DROP POLICY IF EXISTS "Admin update invoice_settings" ON public.invoice_settings;

CREATE POLICY "Admin read invoice_settings"
  ON public.invoice_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin insert invoice_settings"
  ON public.invoice_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin update invoice_settings"
  ON public.invoice_settings FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- 6. Seed default invoice_settings row (once only)
-- ============================================================

INSERT INTO public.invoice_settings (
  business_name, business_address, business_phone, business_whatsapp,
  business_email, gstin, udyam, default_gst_applicable, default_gst_rate,
  payment_qr_url, invoice_terms
)
SELECT
  'Saanvi Royal Travels',
  'Karnpura, Tarwara, Siwan, Bihar 841226',
  '+91 9229764300',
  '+91 9939814111',
  'saanviroyaltravels@gmail.com',
  '10GXCPK1034H1Z3',
  'UDYAM-BR-35-0015333',
  false,
  18,
  '',
  'Thank you for choosing Saanvi Royal Travels. We look forward to serving you again!'
WHERE NOT EXISTS (SELECT 1 FROM public.invoice_settings);

-- ============================================================
-- 7. Correct phone/email in site_settings if still old values
--    (safe UPDATE — only changes rows with old/wrong values;
--     category stays 'contact' so no constraint violation)
-- ============================================================

UPDATE public.site_settings
SET setting_value = '+91 9229764300', updated_at = NOW()
WHERE setting_key = 'phone'
  AND setting_value IN ('+91 98765 43210', '+919876543210', '98765 43210');

UPDATE public.site_settings
SET setting_value = '+91 9939814111', updated_at = NOW()
WHERE setting_key = 'whatsapp'
  AND setting_value IN ('+91 9876543210', '+919876543210', '9876543210', '+91 98765 43210');

UPDATE public.site_settings
SET setting_value = 'saanviroyaltravels@gmail.com', updated_at = NOW()
WHERE setting_key = 'email'
  AND setting_value = 'info@saanviroyaltravels.com';

UPDATE public.site_settings
SET setting_value = 'Karnpura, Tarwara, Siwan, Bihar 841226', updated_at = NOW()
WHERE setting_key = 'office_address'
  AND setting_value IN ('Siwan, Bihar, India', 'Siwan, Bihar');

-- ============================================================
-- VERIFICATION QUERIES (read-only — run after migration)
-- ============================================================

-- CHECK 1: invoices table exists and has correct structure
SELECT 'invoices table' AS check_name,
       COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invoices';

-- CHECK 2: invoice_settings table exists with default row
SELECT 'invoice_settings' AS check_name,
       business_name, gstin, udyam, payment_qr_url, default_gst_applicable
FROM public.invoice_settings LIMIT 1;

-- CHECK 3: site_settings NOT modified beyond the safe UPDATEs above
SELECT 'site_settings categories in use' AS check_name,
       ARRAY_AGG(DISTINCT category ORDER BY category) AS categories
FROM public.site_settings;

-- CHECK 4: RLS status
SELECT 'RLS status' AS check_name,
       relname AS table_name,
       relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN ('invoices', 'invoice_settings')
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
