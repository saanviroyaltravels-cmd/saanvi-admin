-- ============================================================
-- FINAL MIGRATION: Add all missing columns to website_settings
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add every column the admin settings page expects
ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS company_name      TEXT DEFAULT 'Saanvi Royal Travels',
  ADD COLUMN IF NOT EXISTS tagline           TEXT DEFAULT 'Your Trusted Travel Partner',
  ADD COLUMN IF NOT EXISTS favicon_url       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone             TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email             TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email2            TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS city              TEXT DEFAULT 'Siwan',
  ADD COLUMN IF NOT EXISTS state             TEXT DEFAULT 'Bihar',
  ADD COLUMN IF NOT EXISTS pincode           TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_map_url    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS gst_number        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS upi_id            TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS upi_qr_url        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_name         TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_ifsc         TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_holder       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_url      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_url     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS youtube_url       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS twitter_url       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS footer_text       TEXT DEFAULT '';

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
