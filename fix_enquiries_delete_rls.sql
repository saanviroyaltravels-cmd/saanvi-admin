-- ============================================================
-- FIX: ENQUIRIES PERMANENT DELETE & UPDATE RLS POLICY
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/oyfahfvudhhwitxjedrd/sql)
-- ============================================================

-- 1. Enable RLS on enquiries table
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- 2. Drop any previous conflicting policies on enquiries
DROP POLICY IF EXISTS "Admin manage enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Public select enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Public insert enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "pub_insert_enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Allow all on enquiries" ON public.enquiries;

-- 3. Public Customers: INSERT ONLY (No SELECT, No UPDATE, No DELETE)
CREATE POLICY "Public insert enquiries" ON public.enquiries
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. Authorized Admins: FULL ACCESS (SELECT, UPDATE, DELETE)
CREATE POLICY "Admin manage enquiries" ON public.enquiries
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role_name IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role_name IN ('admin', 'super_admin')
  )
);
