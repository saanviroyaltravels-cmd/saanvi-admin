-- ============================================
-- Package Images Storage Bucket Setup
-- Run in Supabase SQL Editor
-- ============================================

-- Create bucket for package images
INSERT INTO storage.buckets (id, name, public)
VALUES ('package-images', 'package-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public to read all package images
CREATE POLICY "Public read package-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'package-images');

-- Allow only admin users to upload
CREATE POLICY "Admin upload package-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'package-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role_name IN ('admin', 'super_admin')
  )
);

-- Allow admin to update (replace)
CREATE POLICY "Admin update package-images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'package-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role_name IN ('admin', 'super_admin')
  )
);

-- Allow admin to delete
CREATE POLICY "Admin delete package-images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'package-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role_name IN ('admin', 'super_admin')
  )
);
