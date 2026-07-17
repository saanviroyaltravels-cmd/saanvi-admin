-- SQL MIGRATION: Update Offers Table
-- Run this in the Supabase SQL Editor

ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS offer_price NUMERIC DEFAULT 0;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.packages(id);
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS offer_type TEXT;

-- Create special-offers bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('special-offers', 'special-offers', TRUE) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "pub_read_offer_images" ON storage.objects;
CREATE POLICY "pub_read_offer_images" ON storage.objects FOR SELECT USING (bucket_id = 'special-offers');

DROP POLICY IF EXISTS "admin_manage_offer_images" ON storage.objects;
CREATE POLICY "admin_manage_offer_images" ON storage.objects FOR ALL USING (
  bucket_id = 'special-offers' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
      AND profiles.role_name IN ('admin', 'super_admin', 'staff')
  )
);
