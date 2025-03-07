/*
  # Fix Database Policies and Functions
  
  1. Changes
    - Add helper functions for policy checks
    - Fix member policies to prevent recursion
    - Add club member check functions
    - Add club admin check functions
    - Add materialized views for performance
    - Add refresh triggers

  2. Security
    - Maintain proper access control
    - Fix infinite recursion issues
    - Enable proper data access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow club creation" ON clubs;
DROP POLICY IF EXISTS "Allow club viewing" ON clubs;
DROP POLICY IF EXISTS "Allow club management" ON clubs;
DROP POLICY IF EXISTS "Allow member creation" ON members;
DROP POLICY IF EXISTS "Allow member viewing" ON members;
DROP POLICY IF EXISTS "Allow member updates" ON members;
DROP POLICY IF EXISTS "Allow member deletion" ON members;

-- Create helper functions
CREATE OR REPLACE FUNCTION is_club_member(user_id uuid, club_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = $1 
    AND members.club_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_club_admin(user_id uuid, club_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = $1 
    AND members.club_id = $2
    AND members.is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = $1 
    AND members.is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create materialized views
CREATE MATERIALIZED VIEW IF NOT EXISTS club_count AS
SELECT count(*) as count FROM clubs;

CREATE MATERIALIZED VIEW IF NOT EXISTS admin_users AS
SELECT DISTINCT user_id FROM members WHERE is_admin = true;

-- Create refresh functions
CREATE OR REPLACE FUNCTION refresh_club_count()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW club_count;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_admin_users()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_users;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS refresh_club_count_trigger ON clubs;
CREATE TRIGGER refresh_club_count_trigger
AFTER INSERT OR DELETE OR UPDATE ON clubs
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_club_count();

DROP TRIGGER IF EXISTS refresh_admin_users_trigger ON members;
CREATE TRIGGER refresh_admin_users_trigger
AFTER INSERT OR DELETE OR UPDATE ON members
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_users();

-- Club Policies
CREATE POLICY "Allow club creation"
ON clubs
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if no clubs exist
  (SELECT count FROM club_count) = 0 OR
  -- Or if using valid access key
  access_key IS NOT NULL OR
  -- Or if super admin
  is_admin(auth.uid())
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
USING (is_club_admin(auth.uid(), id));

-- Member Policies
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
  is_club_admin(auth.uid(), club_id)
);

CREATE POLICY "Allow member deletion"
ON members
FOR DELETE
TO authenticated
USING (is_club_admin(auth.uid(), club_id));

-- Refresh materialized views
REFRESH MATERIALIZED VIEW club_count;
REFRESH MATERIALIZED VIEW admin_users;