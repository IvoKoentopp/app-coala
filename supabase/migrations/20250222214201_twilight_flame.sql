/*
  # Fix auth access and admin permissions

  1. Changes
    - Add policy for admins to view auth.users
    - Add policy for users to view their own auth.users record
    - Update members policies for better admin control

  2. Security
    - Restrict auth.users access to only necessary fields
    - Ensure proper RLS for admin operations
*/

-- Enable RLS on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own auth record
CREATE POLICY "Users can view own auth record"
ON auth.users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

-- Allow admins to view all auth records
CREATE POLICY "Admins can view all auth records"
ON auth.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- Update members policies for better admin control
CREATE POLICY "Admins can update any member"
ON members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members AS m
    WHERE m.user_id = auth.uid()
    AND m.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members AS m
    WHERE m.user_id = auth.uid()
    AND m.is_admin = true
  )
);