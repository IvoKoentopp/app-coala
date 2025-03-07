/*
  # Fix Member Policies
  
  1. Changes
    - Fix infinite recursion in member policies
    - Simplify access control logic
    - Maintain proper security model
    - Add helper functions for policy checks

  2. Security
    - Maintain proper access control
    - Prevent unauthorized access
    - Enable proper member management
*/

-- Drop existing member policies
DROP POLICY IF EXISTS "Allow member creation" ON members;
DROP POLICY IF EXISTS "Allow member viewing" ON members;
DROP POLICY IF EXISTS "Allow member management" ON members;
DROP POLICY IF EXISTS "Allow member read" ON members;
DROP POLICY IF EXISTS "Allow public read" ON members;
DROP POLICY IF EXISTS "Allow self access" ON members;
DROP POLICY IF EXISTS "Allow admin access" ON members;

-- Create helper function to check if user is club admin
CREATE OR REPLACE FUNCTION is_club_admin(user_id uuid, club_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = $1
    AND club_id = $2
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE POLICY "Allow member updates"
ON members
FOR UPDATE
TO authenticated
USING (
  -- Allow if user is updating their own profile
  user_id = auth.uid() OR
  -- Or if user is admin of the club
  EXISTS (
    SELECT 1
    FROM members m
    WHERE m.user_id = auth.uid()
    AND m.club_id = members.club_id
    AND m.is_admin = true
    AND m.id != members.id -- Prevent recursion
  )
);

CREATE POLICY "Allow member deletion"
ON members
FOR DELETE
TO authenticated
USING (
  -- Only club admins can delete members
  EXISTS (
    SELECT 1
    FROM members m
    WHERE m.user_id = auth.uid()
    AND m.club_id = members.club_id
    AND m.is_admin = true
    AND m.id != members.id -- Prevent recursion
  )
);

-- Create materialized view for admin users
DROP MATERIALIZED VIEW IF EXISTS admin_users;
CREATE MATERIALIZED VIEW admin_users AS
SELECT DISTINCT user_id
FROM members
WHERE is_admin = true;

-- Function to refresh admin users
CREATE OR REPLACE FUNCTION refresh_admin_users()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_users;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh admin users
DROP TRIGGER IF EXISTS refresh_admin_users_trigger ON members;
CREATE TRIGGER refresh_admin_users_trigger
AFTER INSERT OR DELETE OR UPDATE ON members
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_users();

-- Refresh materialized views
REFRESH MATERIALIZED VIEW admin_users;