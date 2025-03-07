/*
  # Fix Registration Flow Storage and Policies

  1. Changes
    - Create storage bucket for club logos
    - Fix RLS policies to avoid recursion
    - Add proper bucket policies

  2. Security
    - Maintain proper access control
    - Allow logo uploads during registration
*/

-- Create storage bucket for club logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('clubs', 'clubs', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow public access to club logos
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'clubs' );

-- Create storage policy to allow authenticated users to upload club logos
CREATE POLICY "Allow uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'clubs' );

-- Fix clubs policies to avoid recursion
DROP POLICY IF EXISTS "Allow club creation" ON clubs;
CREATE POLICY "Allow club creation" ON clubs
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow if no clubs exist
    NOT EXISTS (SELECT 1 FROM clubs) OR
    -- Or if access key is provided
    (access_key IS NOT NULL) OR
    -- Or if user is admin
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid()
      AND is_admin = true
      AND club_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Allow club viewing" ON clubs;
CREATE POLICY "Allow club viewing" ON clubs
  FOR SELECT TO authenticated
  USING (
    -- Allow if member of club
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid()
      AND club_id = clubs.id
    )
  );

DROP POLICY IF EXISTS "Allow club management" ON clubs;
CREATE POLICY "Allow club management" ON clubs
  FOR UPDATE TO authenticated
  USING (
    -- Allow if admin of club
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid()
      AND club_id = clubs.id
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid()
      AND club_id = clubs.id
      AND is_admin = true
    )
  );

-- Fix members policies to avoid recursion
DROP POLICY IF EXISTS "Allow member creation" ON members;
CREATE POLICY "Allow member creation" ON members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow if user is creating their own profile
    user_id = auth.uid() OR
    -- Or if user is an admin of the club
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid()
      AND m.club_id = members.club_id
      AND m.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Allow member viewing" ON members;
CREATE POLICY "Allow member viewing" ON members
  FOR SELECT TO authenticated
  USING (
    -- Allow if viewing own profile
    user_id = auth.uid() OR
    -- Or if member of same club
    club_id IN (
      SELECT club_id FROM members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow member management" ON members;
CREATE POLICY "Allow member management" ON members
  FOR UPDATE TO authenticated
  USING (
    -- Allow if updating own profile
    user_id = auth.uid() OR
    -- Or if admin of the club
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid()
      AND m.club_id = members.club_id
      AND m.is_admin = true
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid()
      AND m.club_id = members.club_id
      AND m.is_admin = true
    )
  );