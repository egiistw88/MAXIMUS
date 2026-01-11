-- Tighten profile visibility to ensure absolute privacy
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing overly-permissive policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;

-- 2. Create a new strict policy for viewing
CREATE POLICY "Users can only view their own profile."
  ON profiles FOR SELECT
  USING ( auth.uid() = id );

-- 3. (Optional but recommended) Verify other policies
-- They should already be restricted to auth.uid() = id based on previous migration files,
-- but this re-enforces it.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
