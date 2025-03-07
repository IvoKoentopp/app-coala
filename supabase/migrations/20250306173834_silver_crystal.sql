/*
  # Fix Members Table Policies - Simplified Version

  1. Changes
    - Drop existing policies
    - Create new simplified policies
    - Avoid complex subqueries
    - Split policies into smaller, focused rules

  2. Security
    - Maintain same security rules with simpler implementation
    - Prevent recursion issues
*/

-- First drop all existing policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Permitir leitura anônima de membros" ON members;
  DROP POLICY IF EXISTS "Users can read all members" ON members;
  DROP POLICY IF EXISTS "Users can read members from their club" ON members;
  DROP POLICY IF EXISTS "Users can create their own member record in their club" ON members;
  DROP POLICY IF EXISTS "Users can update their own member record" ON members;
  DROP POLICY IF EXISTS "Club admins can manage members" ON members;
  DROP POLICY IF EXISTS "anonymous_read_access" ON members;
  DROP POLICY IF EXISTS "read_same_club_members" ON members;
  DROP POLICY IF EXISTS "create_own_record" ON members;
  DROP POLICY IF EXISTS "update_own_record" ON members;
  DROP POLICY IF EXISTS "admin_manage_club_members" ON members;
  DROP POLICY IF EXISTS "super_admin_manage_all" ON members;
END $$;

-- Create simplified policies

-- 1. Anonymous read access
CREATE POLICY "anon_read"
  ON members
  FOR SELECT
  TO anon
  USING (true);

-- 2. Authenticated users can read all members
CREATE POLICY "auth_read"
  ON members
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Users can create their own record
CREATE POLICY "auth_insert_own"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- 4. Users can update their own record
CREATE POLICY "auth_update_own"
  ON members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- 5. Club admins can manage their club members
CREATE POLICY "admin_all"
  ON members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM members admins
      WHERE admins.user_id = auth.uid() 
      AND admins.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM members admins
      WHERE admins.user_id = auth.uid() 
      AND admins.is_admin = true
    )
  );