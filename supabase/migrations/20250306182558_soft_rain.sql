/*
  # Fix Registration Flow

  1. Changes
    - Add helper functions for registration
    - Fix RLS policies for registration
    - Add proper club count materialized view refresh

  2. Security
    - Maintain proper access control
    - Allow new club creation
    - Allow member creation during registration
*/

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = $1
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user belongs to club
CREATE OR REPLACE FUNCTION is_club_member(user_id uuid, club_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = $1
    AND club_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to validate club invite
CREATE OR REPLACE FUNCTION validate_club_invite(p_code text, p_email text)
RETURNS TABLE (
  is_valid boolean,
  club_id uuid,
  message text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN i.id IS NULL THEN false
      WHEN i.used_at IS NOT NULL THEN false
      WHEN i.expires_at < now() THEN false
      WHEN i.email != p_email THEN false
      ELSE true
    END as is_valid,
    i.club_id,
    CASE 
      WHEN i.id IS NULL THEN 'Convite inválido'
      WHEN i.used_at IS NOT NULL THEN 'Convite já utilizado'
      WHEN i.expires_at < now() THEN 'Convite expirado'
      WHEN i.email != p_email THEN 'Email não corresponde ao convite'
      ELSE 'Convite válido'
    END as message
  FROM club_invites i
  WHERE i.code = p_code
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies that depend on club_count
DROP POLICY IF EXISTS "Allow club creation" ON clubs;

-- Drop materialized view and recreate
DROP MATERIALIZED VIEW IF EXISTS club_count CASCADE;
CREATE MATERIALIZED VIEW club_count AS
SELECT count(*) FROM clubs;

-- Function to refresh club count
CREATE OR REPLACE FUNCTION refresh_club_count()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW club_count;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh club count
DROP TRIGGER IF EXISTS refresh_club_count_trigger ON clubs;
CREATE TRIGGER refresh_club_count_trigger
AFTER INSERT OR DELETE OR UPDATE ON clubs
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_club_count();

-- Fix clubs policies
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow club creation" ON clubs
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT count = 0 FROM club_count) OR
    (access_key IS NOT NULL) OR
    is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Allow club viewing" ON clubs;
CREATE POLICY "Allow club viewing" ON clubs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.uid()
      AND members.club_id = clubs.id
    )
  );

DROP POLICY IF EXISTS "Allow club management" ON clubs;
CREATE POLICY "Allow club management" ON clubs
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Fix members policies
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow member creation" ON members;
CREATE POLICY "Allow member creation" ON members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow if user is creating their own profile
    (user_id = auth.uid()) OR
    -- Or if user is an admin
    is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Allow member viewing" ON members;
CREATE POLICY "Allow member viewing" ON members
  FOR SELECT TO authenticated
  USING (
    -- Allow if viewing own profile
    user_id = auth.uid() OR
    -- Or if member of same club
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid()
      AND m.club_id = members.club_id
    )
  );

DROP POLICY IF EXISTS "Allow member management" ON members;
CREATE POLICY "Allow member management" ON members
  FOR UPDATE TO authenticated
  USING (
    -- Allow if updating own profile
    user_id = auth.uid() OR
    -- Or if admin
    is_admin(auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid() OR
    is_admin(auth.uid())
  );

-- Refresh club count
REFRESH MATERIALIZED VIEW club_count;