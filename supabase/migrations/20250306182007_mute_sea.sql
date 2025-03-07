/*
  # Fix RLS Policies

  1. Changes
    - Fix infinite recursion in member policies
    - Add better RLS policies for all tables
    - Add helper functions for policy checks
    - Improve security while maintaining functionality

  2. Security
    - Maintain data isolation between clubs
    - Ensure proper access control
    - Fix recursive policy issues
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

-- Fix members table policies
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON members;
CREATE POLICY "Users can view own profile" ON members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own profile" ON members;
CREATE POLICY "Users can update own profile" ON members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_all" ON members;
CREATE POLICY "admin_all" ON members
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Fix club_settings policies
ALTER TABLE club_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read club settings" ON club_settings;
CREATE POLICY "Everyone can read club settings" ON club_settings
  FOR SELECT TO authenticated
  USING (is_club_member(auth.uid(), club_id));

DROP POLICY IF EXISTS "Only admins can modify club settings" ON club_settings;
CREATE POLICY "Only admins can modify club settings" ON club_settings
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Fix monthly_fees policies
ALTER TABLE monthly_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read monthly fees" ON monthly_fees;
CREATE POLICY "Everyone can read monthly fees" ON monthly_fees
  FOR SELECT TO authenticated
  USING (is_club_member(auth.uid(), club_id));

DROP POLICY IF EXISTS "Only admins can manage monthly fees" ON monthly_fees;
CREATE POLICY "Only admins can manage monthly fees" ON monthly_fees
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Fix games policies
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read games" ON games;
CREATE POLICY "Everyone can read games" ON games
  FOR SELECT TO authenticated
  USING (is_club_member(auth.uid(), club_id));

DROP POLICY IF EXISTS "Only admins can manage games" ON games;
CREATE POLICY "Only admins can manage games" ON games
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Fix game_participants policies
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read game participants" ON game_participants;
CREATE POLICY "Everyone can read game participants" ON game_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_participants.game_id
      AND is_club_member(auth.uid(), games.club_id)
    )
  );

DROP POLICY IF EXISTS "Only admins can manage game participants" ON game_participants;
CREATE POLICY "Only admins can manage game participants" ON game_participants
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Fix game_statistics policies
ALTER TABLE game_statistics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read game statistics" ON game_statistics;
CREATE POLICY "Everyone can read game statistics" ON game_statistics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_statistics.game_id
      AND is_club_member(auth.uid(), games.club_id)
    )
  );

DROP POLICY IF EXISTS "Only admins can manage game statistics" ON game_statistics;
CREATE POLICY "Only admins can manage game statistics" ON game_statistics
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Fix accounts policies
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read accounts" ON accounts;
CREATE POLICY "Everyone can read accounts" ON accounts
  FOR SELECT TO authenticated
  USING (is_club_member(auth.uid(), club_id));

DROP POLICY IF EXISTS "Only admins can manage accounts" ON accounts;
CREATE POLICY "Only admins can manage accounts" ON accounts
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Fix transactions policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read transactions" ON transactions;
CREATE POLICY "Everyone can read transactions" ON transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = transactions.account_id
      AND is_club_member(auth.uid(), accounts.club_id)
    )
  );

DROP POLICY IF EXISTS "Only admins can manage transactions" ON transactions;
CREATE POLICY "Only admins can manage transactions" ON transactions
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Fix clubs policies
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own clubs" ON clubs;
CREATE POLICY "Users can view own clubs" ON clubs
  FOR SELECT TO authenticated
  USING (is_club_member(auth.uid(), id));

DROP POLICY IF EXISTS "Allow club creation" ON clubs;
CREATE POLICY "Allow club creation" ON clubs
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT count = 0 FROM club_count) OR
    (access_key IS NOT NULL) OR
    is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Allow club management" ON clubs;
CREATE POLICY "Allow club management" ON clubs
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));