-- ============================================
-- Phase 3 — Offers, Notifications & Popups Database Setup
-- Run this script in the Supabase SQL Editor
-- ============================================

-- Drop old tables if they exist to ensure clean schema update
DROP TABLE IF EXISTS public.offers CASCADE;
DROP TABLE IF EXISTS public.popup_notifications CASCADE;
DROP TABLE IF EXISTS public.announcement_bar CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;

-- 1. Offers Table
CREATE TABLE public.offers (
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

-- 2. Popup Notifications Table
CREATE TABLE public.popup_notifications (
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

-- 3. Announcement Bar Table (single row)
CREATE TABLE public.announcement_bar (
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

-- 4. Announcements Table (for general site announcements)
CREATE TABLE public.announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'info',
  is_active BOOLEAN DEFAULT true,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_bar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create SELECT policies (Public access)
CREATE POLICY "Public read offers" ON public.offers FOR SELECT USING (true);
CREATE POLICY "Public read popups" ON public.popup_notifications FOR SELECT USING (true);
CREATE POLICY "Public read announcement_bar" ON public.announcement_bar FOR SELECT USING (true);
CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (true);

-- Create WRITE policies (Admin authenticated access)
CREATE POLICY "Admin manage offers" ON public.offers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
);

CREATE POLICY "Admin manage popups" ON public.popup_notifications FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
);

CREATE POLICY "Admin manage announcement_bar" ON public.announcement_bar FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
);

CREATE POLICY "Admin manage announcements" ON public.announcements FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role_name IN ('admin','super_admin'))
);

-- Seed Initial Data

-- Seed active offers
INSERT INTO public.offers (title, description, image, button_text, button_link, priority, is_active) VALUES
('Early Bird Discount', 'Book any packages 7 days in advance and get 10% off your total booking!', 'https://picsum.photos/seed/earlybird/600/400.jpg', 'Explore Packages', '/?page=packages', 1, true),
('Ayodhya Pilgrimage Special', 'Special discount of ₹500 on all tour packages to Ayodhya this month.', 'https://picsum.photos/seed/ayodhyaoffer/600/400.jpg', 'Book Ayodhya Tour', '/packages/ayodhya-2-days', 2, true);

-- Seed announcement bar
INSERT INTO public.announcement_bar (text, bg_color, text_color, is_scrolling, button_text, button_url, is_active) VALUES
('🚨 Special Offer: flat 10% off on all Bodh Gaya and Rajgir packages. Limited seats remaining! Book today.', '#dc2626', '#ffffff', true, 'View Packages', '/?page=packages', true);

-- Seed popup notification
INSERT INTO public.popup_notifications (title, description, image, button_text, button_url, bg_color, text_color, delay_seconds, is_active) VALUES
('Welcome to Saanvi Royal Travels!', 'Discover premium pilgrim tours and reliable outstation cab bookings from Siwan, Bihar. Get customized itinerary planning with no advance payments!', 'https://picsum.photos/seed/welcomepopup/600/300.jpg', 'Contact Us Now', '/?page=contact', '#ffffff', '#0f172a', 3, true);
