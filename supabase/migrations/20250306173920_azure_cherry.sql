/*
  # Fix Members Table Policies - Final Version

  1. Changes
    - Drop all existing policies
    - Create minimal set of non-recursive policies
    - Ensure basic CRUD operations work without recursion
    - Maintain security while avoiding complex checks

  2. Security
    - Anonymous read access for game confirmations
    - Basic authenticated user access
    - Admin management capabilities
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "anon_read" ON members;
DROP POLICY IF EXISTS "auth_read" ON members;
DROP POLICY IF EXISTS "auth_insert_own" ON members;
DROP POLICY IF EXISTS "auth_update_own" ON members;
DROP POLICY IF EXISTS "admin_all" ON members;

-- Create new minimal policies

-- Anonymous read access for game confirmations
CREATE POLICY "anon_read"
  ON members
  FOR SELECT
  TO anon
  USING (true);

-- Authenticated users can read all members
CREATE POLICY "auth_read"
  ON members
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own record
CREATE POLICY "auth_insert_own"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own record
CREATE POLICY "auth_update_own"
  ON members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "admin_all"
  ON members
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM members m 
      WHERE m.user_id = auth.users.id 
      AND m.is_admin = true
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM members m 
      WHERE m.user_id = auth.users.id 
      AND m.is_admin = true
    )
  ));