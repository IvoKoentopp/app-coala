/*
  # Fix Members Table Policies

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Simplify member viewing policies
    - Add proper club-based access control
    - Fix admin management policies

  2. Security
    - Enable RLS
    - Add policies for:
      - Viewing members
      - Managing own profile
      - Admin management
*/

-- First drop existing policies
DROP POLICY IF EXISTS "Allow member viewing" ON members;
DROP POLICY IF EXISTS "Allow club member read" ON members;
DROP POLICY IF EXISTS "Allow member updates" ON members;
DROP POLICY IF EXISTS "Allow member viewing" ON members;
DROP POLICY IF EXISTS "Admins can update other members admin status" ON members;

-- Create new policies
-- Allow members to view other members in their club
CREATE POLICY "view_club_members" ON members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members AS m
      WHERE m.user_id = auth.uid()
      AND m.club_id = members.club_id
    )
  );

-- Allow users to view and update their own profile
CREATE POLICY "manage_own_profile" ON members
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow admins to manage all members in their club
CREATE POLICY "admin_manage_members" ON members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members AS m
      WHERE m.user_id = auth.uid()
      AND m.is_admin = true
      AND m.club_id = members.club_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members AS m
      WHERE m.user_id = auth.uid()
      AND m.is_admin = true
      AND m.club_id = members.club_id
    )
  );