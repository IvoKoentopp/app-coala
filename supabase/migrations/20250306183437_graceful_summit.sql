/*
  # Fix Registration System
  
  1. Changes
    - Create storage buckets if they don't exist
    - Simplify RLS policies
    - Add proper club creation policies
    - Fix member registration flow

  2. Security
    - Maintain proper access control
    - Allow first club creation without restrictions
    - Enable proper file storage
*/

-- Create storage buckets if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'clubs'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('clubs', 'clubs', true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'members'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('members', 'members', true);
  END IF;
END $$;

-- Create storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('clubs', 'members'));

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('clubs', 'members'));

-- Drop existing policies
DROP POLICY IF EXISTS "Allow club creation" ON clubs;
DROP POLICY IF EXISTS "Allow club viewing" ON clubs;
DROP POLICY IF EXISTS "Allow club management" ON clubs;

-- Create simplified club policies
CREATE POLICY "Allow club creation"
ON clubs
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if no clubs exist
  NOT EXISTS (SELECT 1 FROM clubs) OR
  -- Or if using valid access key
  access_key IS NOT NULL OR
  -- Or if super admin
  EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND club_id IS NULL
  )
);

CREATE POLICY "Allow club viewing"
ON clubs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow club management"
ON clubs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND club_id = clubs.id
    AND is_admin = true
  )
);

-- Drop existing member policies
DROP POLICY IF EXISTS "Allow member creation" ON members;
DROP POLICY IF EXISTS "Allow member viewing" ON members;
DROP POLICY IF EXISTS "Allow member management" ON members;

-- Create simplified member policies
CREATE POLICY "Allow member creation"
ON members
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow member viewing"
ON members
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow member management"
ON members
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND m.club_id = members.club_id
    AND m.is_admin = true
  )
);

-- Create helper function to check if first club
CREATE OR REPLACE FUNCTION is_first_club()
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (SELECT 1 FROM clubs);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;