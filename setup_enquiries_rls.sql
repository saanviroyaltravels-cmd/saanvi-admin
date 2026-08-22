-- ============================================================
-- SAANVI ROYAL TRAVELS — ENQUIRIES TABLE & RLS POLICIES
-- ============================================================

-- 1. Ensure table structure
CREATE TABLE IF NOT EXISTS public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  replied BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON public.enquiries(created_at DESC);

-- 3. Enable Row-Level Security
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- 4. Clean up legacy or overly permissive policies
DROP POLICY IF EXISTS "Public insert enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "pub_insert_enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Allow all on enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Public select enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "pub_select_enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Admin manage enquiries" ON public.enquiries;

-- 5. PUBLIC POLICY: Anonymous and authenticated customers can ONLY INSERT enquiries
CREATE POLICY "Public insert enquiries" ON public.enquiries
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 6. ADMIN POLICY: Authorized admins can SELECT, UPDATE, and DELETE enquiries
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
