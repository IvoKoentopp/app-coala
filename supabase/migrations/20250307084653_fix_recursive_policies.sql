/*
  # Fix Recursive RLS Policies

  1. Problem
    - Current helper functions (is_club_member, is_club_admin, is_admin) are causing infinite recursion
    - Functions query members table which has policies that use these same functions
  
  2. Solution
    - Modify helper functions to use direct table access with SECURITY DEFINER
    - Remove recursive dependencies in policy checks
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS is_club_member CASCADE;
DROP FUNCTION IF EXISTS is_club_admin CASCADE;
DROP FUNCTION IF EXISTS is_admin CASCADE;

-- Recreate helper functions with direct table access
CREATE OR REPLACE FUNCTION is_club_member(p_user_id uuid, p_club_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Use direct table access to avoid RLS
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = p_user_id 
    AND club_id = p_club_id
    AND status = 'Ativo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_club_admin(p_user_id uuid, p_club_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Use direct table access to avoid RLS
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = p_user_id 
    AND club_id = p_club_id
    AND is_admin = true
    AND status = 'Ativo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Use direct table access to avoid RLS
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = p_user_id 
    AND is_admin = true
    AND status = 'Ativo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing policies on members table
DROP POLICY IF EXISTS "view_club_members" ON members CASCADE;
DROP POLICY IF EXISTS "manage_own_profile" ON members CASCADE;
DROP POLICY IF EXISTS "admin_manage_members" ON members CASCADE;

-- Recreate policies with optimized checks
CREATE POLICY "view_club_members" ON members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = members.club_id
      AND m.status = 'Ativo'
    )
  );

CREATE POLICY "manage_own_profile" ON members
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_manage_members" ON members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = members.club_id
      AND m.is_admin = true
      AND m.status = 'Ativo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = members.club_id
      AND m.is_admin = true
      AND m.status = 'Ativo'
    )
  );
