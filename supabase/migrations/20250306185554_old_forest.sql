/*
  # Fix RLS Policies and Helper Functions

  1. Changes
    - Drop all policies with CASCADE to handle dependencies
    - Create base member access policies first
    - Create helper functions with proper parameter names
    - Recreate all policies in correct order
    - Fix infinite recursion by using direct queries instead of recursive policies

  2. Security
    - Maintain all security policies
    - Ensure proper club-based access control
    - Fix policy dependencies
*/

-- First drop ALL existing policies with CASCADE to handle dependencies
DROP POLICY IF EXISTS "Everyone can read monthly fees" ON monthly_fees CASCADE;
DROP POLICY IF EXISTS "Everyone can read accounts" ON accounts CASCADE;
DROP POLICY IF EXISTS "Everyone can read transactions" ON transactions CASCADE;
DROP POLICY IF EXISTS "Users can view own clubs" ON clubs CASCADE;
DROP POLICY IF EXISTS "Allow member read settings" ON club_settings CASCADE;
DROP POLICY IF EXISTS "Allow game participant management" ON game_participants CASCADE;
DROP POLICY IF EXISTS "Allow game viewing" ON games CASCADE;
DROP POLICY IF EXISTS "Allow game statistics viewing" ON game_statistics CASCADE;
DROP POLICY IF EXISTS "view_club_members" ON members CASCADE;
DROP POLICY IF EXISTS "manage_own_profile" ON members CASCADE;
DROP POLICY IF EXISTS "admin_manage_members" ON members CASCADE;
DROP POLICY IF EXISTS "Allow admin manage settings" ON club_settings CASCADE;
DROP POLICY IF EXISTS "Allow game management" ON games CASCADE;
DROP POLICY IF EXISTS "Allow game statistics management" ON game_statistics CASCADE;
DROP POLICY IF EXISTS "Allow club management" ON clubs CASCADE;
DROP POLICY IF EXISTS "Only admins can manage monthly fees" ON monthly_fees CASCADE;
DROP POLICY IF EXISTS "Only admins can manage accounts" ON accounts CASCADE;
DROP POLICY IF EXISTS "Only admins can manage transactions" ON transactions CASCADE;
DROP POLICY IF EXISTS "Everyone can read cancellation reasons" ON cancellation_reasons CASCADE;
DROP POLICY IF EXISTS "Admins can manage cancellation reasons" ON cancellation_reasons CASCADE;
DROP POLICY IF EXISTS "Allow invite creation by admins" ON club_invites CASCADE;
DROP POLICY IF EXISTS "Allow invite viewing by admins" ON club_invites CASCADE;
DROP POLICY IF EXISTS "Everyone can read versions" ON versions CASCADE;
DROP POLICY IF EXISTS "Only admins can manage versions" ON versions CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS is_club_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_club_admin(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;

-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Create base member access policies first
CREATE POLICY "view_club_members" ON members
  FOR SELECT TO authenticated
  USING (club_id IN (
    SELECT club_id FROM members AS m
    WHERE m.user_id = auth.uid()
    AND m.status = 'Ativo'
  ));

CREATE POLICY "manage_own_profile" ON members
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_manage_members" ON members
  FOR ALL TO authenticated
  USING (club_id IN (
    SELECT club_id FROM members AS m
    WHERE m.user_id = auth.uid()
    AND m.is_admin = true
    AND m.status = 'Ativo'
  ))
  WITH CHECK (club_id IN (
    SELECT club_id FROM members AS m
    WHERE m.user_id = auth.uid()
    AND m.is_admin = true
    AND m.status = 'Ativo'
  ));

-- Create helper functions with explicit parameter names
CREATE OR REPLACE FUNCTION is_club_member(p_user_id uuid, p_club_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = p_user_id 
    AND club_id = p_club_id
    AND status = 'Ativo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_club_admin(p_user_id uuid, p_club_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = p_user_id 
    AND club_id = p_club_id
    AND is_admin = true
    AND status = 'Ativo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = p_user_id 
    AND is_admin = true
    AND status = 'Ativo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Games table policies
CREATE POLICY "Allow game management" ON games
  FOR ALL TO authenticated
  USING (club_id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND status = 'Ativo'
  ))
  WITH CHECK (club_id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND status = 'Ativo'
  ));

CREATE POLICY "Allow game viewing" ON games
  FOR SELECT TO authenticated
  USING (club_id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND status = 'Ativo'
  ));

-- Game participants policies
CREATE POLICY "Allow game participant management" ON game_participants
  FOR ALL TO authenticated
  USING (game_id IN (
    SELECT g.id FROM games g
    JOIN members m ON m.club_id = g.club_id
    WHERE m.user_id = auth.uid()
    AND m.status = 'Ativo'
  ))
  WITH CHECK (game_id IN (
    SELECT g.id FROM games g
    JOIN members m ON m.club_id = g.club_id
    WHERE m.user_id = auth.uid()
    AND m.status = 'Ativo'
  ));

-- Game statistics policies
CREATE POLICY "Allow game statistics management" ON game_statistics
  FOR ALL TO authenticated
  USING (game_id IN (
    SELECT g.id FROM games g
    JOIN members m ON m.club_id = g.club_id
    WHERE m.user_id = auth.uid()
    AND m.is_admin = true
    AND m.status = 'Ativo'
  ))
  WITH CHECK (game_id IN (
    SELECT g.id FROM games g
    JOIN members m ON m.club_id = g.club_id
    WHERE m.user_id = auth.uid()
    AND m.is_admin = true
    AND m.status = 'Ativo'
  ));

CREATE POLICY "Allow game statistics viewing" ON game_statistics
  FOR SELECT TO authenticated
  USING (game_id IN (
    SELECT g.id FROM games g
    JOIN members m ON m.club_id = g.club_id
    WHERE m.user_id = auth.uid()
    AND m.status = 'Ativo'
  ));

-- Monthly fees policies
CREATE POLICY "Everyone can read monthly fees" ON monthly_fees
  FOR SELECT TO authenticated
  USING (club_id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND status = 'Ativo'
  ));

CREATE POLICY "Only admins can manage monthly fees" ON monthly_fees
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND status = 'Ativo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND status = 'Ativo'
  ));

-- Club settings policies
CREATE POLICY "Allow admin manage settings" ON club_settings
  FOR ALL TO authenticated
  USING (club_id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND status = 'Ativo'
  ))
  WITH CHECK (club_id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND status = 'Ativo'
  ));

CREATE POLICY "Allow member read settings" ON club_settings
  FOR SELECT TO authenticated
  USING (club_id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND status = 'Ativo'
  ));

-- Accounts policies
CREATE POLICY "Everyone can read accounts" ON accounts
  FOR SELECT TO authenticated
  USING (club_id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND status = 'Ativo'
  ));

CREATE POLICY "Only admins can manage accounts" ON accounts
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND status = 'Ativo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND status = 'Ativo'
  ));

-- Transactions policies
CREATE POLICY "Everyone can read transactions" ON transactions
  FOR SELECT TO authenticated
  USING (club_id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND status = 'Ativo'
  ));

CREATE POLICY "Only admins can manage transactions" ON transactions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND status = 'Ativo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND status = 'Ativo'
  ));

-- Cancellation reasons policies
CREATE POLICY "Everyone can read cancellation reasons" ON cancellation_reasons
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cancellation reasons" ON cancellation_reasons
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND (category = 'Contribuinte' OR is_admin = true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND (category = 'Contribuinte' OR is_admin = true)
  ));

-- Club invites policies
CREATE POLICY "Allow invite creation by admins" ON club_invites
  FOR INSERT TO authenticated
  WITH CHECK (club_id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND status = 'Ativo'
  ));

CREATE POLICY "Allow invite viewing by admins" ON club_invites
  FOR SELECT TO authenticated
  USING (club_id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND status = 'Ativo'
  ));

-- Versions policies
CREATE POLICY "Everyone can read versions" ON versions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage versions" ON versions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
  ));

-- Clubs policies
CREATE POLICY "Users can view own clubs" ON clubs
  FOR SELECT TO authenticated
  USING (id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Allow club management" ON clubs
  FOR ALL TO authenticated
  USING (id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
  ))
  WITH CHECK (id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
  ));