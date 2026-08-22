-- ==============================================================================
-- FIX: ENQUIRIES PERMANENT DELETE & MANAGEMENT RLS POLICY
-- Project: Saanvi Royal Travels (oyfahfvudhhwitxjedrd)
-- Open in Supabase SQL Editor: https://supabase.com/dashboard/project/oyfahfvudhhwitxjedrd/sql/new
-- ==============================================================================

-- 1. Enable Row-Level Security on enquiries table
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- 2. Drop any previous conflicting / incomplete policies
DROP POLICY IF EXISTS "Admin manage enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Public select enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Public insert enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "pub_insert_enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Allow all on enquiries" ON public.enquiries;

-- 3. Public Customers (Anon): Can ONLY submit new enquiries (INSERT only)
CREATE POLICY "Public insert enquiries" ON public.enquiries
FOR INSERT TO anon
WITH CHECK (true);

-- 4. Logged-in Admin (Authenticated): FULL PERMISSIONS (SELECT, UPDATE, DELETE)
CREATE POLICY "Admin manage enquiries" ON public.enquiries
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
