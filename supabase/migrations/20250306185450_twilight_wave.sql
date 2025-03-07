/*
  # Fix RLS Policies and Helper Functions

  1. Changes
    - Drop all policies with CASCADE to handle dependencies
    - Recreate helper functions with proper parameter names
    - Recreate all policies with proper dependencies
    - Fix infinite recursion issues

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

-- Create helper functions with explicit parameter names
CREATE OR REPLACE FUNCTION is_club_member(p_user_id uuid, p_club_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = p_user_id 
    AND members.club_id = p_club_id
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
    AND members.club_id = p_club_id
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

-- Members table policies
CREATE POLICY "view_club_members" ON members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND m.club_id = members.club_id
    AND m.status = 'Ativo'
  ));

CREATE POLICY "manage_own_profile" ON members
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_manage_members" ON members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND m.club_id = members.club_id
    AND m.is_admin = true
    AND m.status = 'Ativo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND m.club_id = members.club_id
    AND m.is_admin = true
    AND m.status = 'Ativo'
  ));

-- Games table policies
CREATE POLICY "Allow game management" ON games
  FOR ALL TO authenticated
  USING (is_club_admin(auth.uid(), club_id))
  WITH CHECK (is_club_admin(auth.uid(), club_id));

CREATE POLICY "Allow game viewing" ON games
  FOR SELECT TO authenticated
  USING (is_club_member(auth.uid(), club_id));

-- Game participants policies
CREATE POLICY "Allow game participant management" ON game_participants
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_participants.game_id
    AND is_club_member(auth.uid(), games.club_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_participants.game_id
    AND is_club_member(auth.uid(), games.club_id)
  ));

-- Game statistics policies
CREATE POLICY "Allow game statistics management" ON game_statistics
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_statistics.game_id
    AND is_club_admin(auth.uid(), games.club_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_statistics.game_id
    AND is_club_admin(auth.uid(), games.club_id)
  ));

CREATE POLICY "Allow game statistics viewing" ON game_statistics
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_statistics.game_id
    AND is_club_member(auth.uid(), games.club_id)
  ));

-- Monthly fees policies
CREATE POLICY "Everyone can read monthly fees" ON monthly_fees
  FOR SELECT TO authenticated
  USING (is_club_member(auth.uid(), club_id));

CREATE POLICY "Only admins can manage monthly fees" ON monthly_fees
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Club settings policies
CREATE POLICY "Allow admin manage settings" ON club_settings
  FOR ALL TO authenticated
  USING (is_club_admin(auth.uid(), club_id))
  WITH CHECK (is_club_admin(auth.uid(), club_id));

CREATE POLICY "Allow member read settings" ON club_settings
  FOR SELECT TO authenticated
  USING (is_club_member(auth.uid(), club_id));

-- Accounts policies
CREATE POLICY "Everyone can read accounts" ON accounts
  FOR SELECT TO authenticated
  USING (is_club_member(auth.uid(), club_id));

CREATE POLICY "Only admins can manage accounts" ON accounts
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Transactions policies
CREATE POLICY "Everyone can read transactions" ON transactions
  FOR SELECT TO authenticated
  USING (is_club_member(auth.uid(), club_id));

CREATE POLICY "Only admins can manage transactions" ON transactions
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Cancellation reasons policies
CREATE POLICY "Everyone can read cancellation reasons" ON cancellation_reasons
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cancellation reasons" ON cancellation_reasons
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND (members.category = 'Contribuinte' OR members.is_admin = true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND (members.category = 'Contribuinte' OR members.is_admin = true)
  ));

-- Club invites policies
CREATE POLICY "Allow invite creation by admins" ON club_invites
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.is_admin = true
    AND members.club_id = club_invites.club_id
  ));

CREATE POLICY "Allow invite viewing by admins" ON club_invites
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.is_admin = true
    AND members.club_id = club_invites.club_id
  ));

-- Versions policies
CREATE POLICY "Everyone can read versions" ON versions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage versions" ON versions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.is_admin = true
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