-- SQL MIGRATION: Add price_type column to packages table
-- Run this script in the Supabase SQL Editor: https://supabase.com/dashboard/project/oyfahfvudhhwitxjedrd/sql

-- 1. Add price_type column to packages table
ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'per_person';

-- 2. Ensure existing packages default to 'per_person' if NULL
UPDATE public.packages 
SET price_type = 'per_person' 
WHERE price_type IS NULL;

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
