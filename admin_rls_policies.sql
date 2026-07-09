-- ==========================================
-- SAANVI TRAVELS ADMIN RLS POLICIES FIX
-- Run this script in the Supabase SQL Editor
-- ==========================================

-- Enable RLS (just in case they aren't enabled yet)
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;

-- PACKAGES: Allow admins to insert, update, delete
CREATE POLICY "Admin manage packages" ON public.packages
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

-- DESTINATIONS: Allow admins to insert, update, delete
CREATE POLICY "Admin manage destinations" ON public.destinations
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

-- VEHICLE TYPES: Allow admins to insert, update, delete
CREATE POLICY "Admin manage vehicle_types" ON public.vehicle_types
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

-- Note: Booking and Profiles tables are already public or have working policies,
-- so this focuses on the tables failing during Admin CRUD operations.
