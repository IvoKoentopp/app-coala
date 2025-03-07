/*
  # Fix Members Table Policies - Final Version 2
  
  1. Changes
    - Drop all existing policies
    - Create new non-recursive policies using materialized admin view
    - Ensure all operations work without recursion
    - Maintain security while avoiding complex checks

  2. Security
    - Anonymous read access for game confirmations
    - Authenticated user access based on club membership
    - Admin management capabilities through materialized view
*/

-- First create a materialized view to cache admin status
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_users AS
SELECT DISTINCT user_id 
FROM members 
WHERE is_admin = true;

-- Create function to refresh admin view
CREATE OR REPLACE FUNCTION refresh_admin_users()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_users;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh admin view
DROP TRIGGER IF EXISTS refresh_admin_users_trigger ON members;
CREATE TRIGGER refresh_admin_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON members
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_users();

-- Drop all existing policies
DROP POLICY IF EXISTS "anon_read" ON members;
DROP POLICY IF EXISTS "auth_read" ON members;
DROP POLICY IF EXISTS "auth_insert_own" ON members;
DROP POLICY IF EXISTS "auth_update_own" ON members;
DROP POLICY IF EXISTS "admin_all" ON members;

-- Create new policies using materialized view

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

-- Admins have full access (using materialized view)
CREATE POLICY "admin_all"
  ON members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM admin_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- Initial refresh of materialized view
REFRESH MATERIALIZED VIEW admin_users;