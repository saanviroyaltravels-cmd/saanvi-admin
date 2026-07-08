-- ============================================
-- Saanvi Admin Panel — Additional Supabase Tables
-- Run this in Supabase SQL Editor
-- ============================================

-- Offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  button_text TEXT DEFAULT 'Book Now',
  button_link TEXT,
  start_date DATE,
  end_date DATE,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Popup notifications
CREATE TABLE IF NOT EXISTS public.popup_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  button_text TEXT,
  button_url TEXT,
  bg_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#0f172a',
  size TEXT DEFAULT 'medium',
  animation TEXT DEFAULT 'fade',
  delay_seconds INTEGER DEFAULT 2,
  show_once BOOLEAN DEFAULT true,
  show_on_home BOOLEAN DEFAULT true,
  show_on_all BOOLEAN DEFAULT false,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Announcement bar (single row)
CREATE TABLE IF NOT EXISTS public.announcement_bar (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  bg_color TEXT DEFAULT '#1e40af',
  text_color TEXT DEFAULT '#ffffff',
  is_scrolling BOOLEAN DEFAULT true,
  button_text TEXT,
  button_url TEXT,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'info',
  is_active BOOLEAN DEFAULT true,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gallery
CREATE TABLE IF NOT EXISTS public.gallery (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  name TEXT,
  category TEXT DEFAULT 'gallery',
  size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Price history
CREATE TABLE IF NOT EXISTS public.price_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id INTEGER,
  package_name TEXT,
  old_price NUMERIC,
  new_price NUMERIC,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Website settings (single row)
CREATE TABLE IF NOT EXISTS public.website_settings (
  id SERIAL PRIMARY KEY,
  company_name TEXT DEFAULT 'Saanvi Royal Travels',
  tagline TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  email2 TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  google_map_url TEXT,
  gst_number TEXT,
  upi_id TEXT,
  upi_qr_url TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  bank_holder TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  youtube_url TEXT,
  twitter_url TEXT,
  footer_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to packages if not exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='featured') THEN
    ALTER TABLE public.packages ADD COLUMN featured BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='popular') THEN
    ALTER TABLE public.packages ADD COLUMN popular BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='includes') THEN
    ALTER TABLE public.packages ADD COLUMN includes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='excludes') THEN
    ALTER TABLE public.packages ADD COLUMN excludes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='pickup_point') THEN
    ALTER TABLE public.packages ADD COLUMN pickup_point TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='hotel_included') THEN
    ALTER TABLE public.packages ADD COLUMN hotel_included BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='meals_included') THEN
    ALTER TABLE public.packages ADD COLUMN meals_included BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='gallery') THEN
    ALTER TABLE public.packages ADD COLUMN gallery TEXT[];
  END IF;
END $$;

-- RLS Policies
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_bar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Public read for website data
CREATE POLICY "Public read offers" ON public.offers FOR SELECT USING (true);
CREATE POLICY "Public read popups" ON public.popup_notifications FOR SELECT USING (true);
CREATE POLICY "Public read announcement_bar" ON public.announcement_bar FOR SELECT USING (true);
CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Public read gallery" ON public.gallery FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON public.website_settings FOR SELECT USING (true);

-- Admin full access
CREATE POLICY "Admin manage offers" ON public.offers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
);
CREATE POLICY "Admin manage popups" ON public.popup_notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
);
CREATE POLICY "Admin manage bar" ON public.announcement_bar FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
);
CREATE POLICY "Admin manage announcements" ON public.announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
);
CREATE POLICY "Admin manage gallery" ON public.gallery FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
);
CREATE POLICY "Admin manage price_history" ON public.price_history FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
);
CREATE POLICY "Admin manage settings" ON public.website_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
);

-- Storage bucket for media
INSERT INTO storage.buckets (id, name, public) VALUES ('saanvi-media', 'saanvi-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read saanvi-media" ON storage.objects FOR SELECT USING (bucket_id = 'saanvi-media');
CREATE POLICY "Admin upload saanvi-media" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'saanvi-media' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
);
CREATE POLICY "Admin delete saanvi-media" ON storage.objects FOR DELETE USING (
  bucket_id = 'saanvi-media' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
);
