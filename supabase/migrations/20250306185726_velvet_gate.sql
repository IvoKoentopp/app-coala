/*
  # Fix RLS Policies and Helper Functions

  1. Changes
    - Drop all policies and functions with CASCADE
    - Create helper functions first
    - Recreate all policies in correct order
    - Fix policy dependencies

  2. Security
    - Maintain all security policies
    - Ensure proper club-based access control
*/

-- First drop ALL existing policies and functions with CASCADE
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
DROP POLICY IF EXISTS "Permitir confirmações anônimas" ON game_participants CASCADE;

DROP FUNCTION IF EXISTS is_club_member CASCADE;
DROP FUNCTION IF EXISTS is_club_admin CASCADE;
DROP FUNCTION IF EXISTS is_admin CASCADE;

-- Create helper functions first
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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

-- Create all policies
CREATE POLICY "view_club_members" ON members
  FOR SELECT TO authenticated
  USING ((is_club_member(auth.uid(), club_id)));

CREATE POLICY "manage_own_profile" ON members
  FOR ALL TO authenticated
  USING ((user_id = auth.uid()));

CREATE POLICY "admin_manage_members" ON members
  FOR ALL TO authenticated
  USING ((is_club_admin(auth.uid(), club_id)));

CREATE POLICY "Allow game management" ON games
  FOR ALL TO authenticated
  USING ((is_club_admin(auth.uid(), club_id)));

CREATE POLICY "Allow game viewing" ON games
  FOR SELECT TO authenticated
  USING ((is_club_member(auth.uid(), club_id)));

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Permitir confirmações anônimas" ON game_participants CASCADE;
DROP POLICY IF EXISTS "Allow game participant management" ON game_participants CASCADE;
DROP POLICY IF EXISTS "Allow admin game participant management" ON game_participants CASCADE;

-- Policy for anonymous confirmations
alter policy "Permitir confirmações anônimas"
on "public"."game_participants"
to anon
using (
  (EXISTS ( SELECT 1
   FROM games
  WHERE ((games.id = game_participants.game_id) AND (games.status = 'Agendado'::text))))
)
with check (
  (EXISTS ( SELECT 1
   FROM games
  WHERE ((games.id = game_participants.game_id) AND (games.status = 'Agendado'::text))))
);

-- Policy for admins to manage participants
CREATE POLICY "Allow admin game participant management"
ON "public"."game_participants"
FOR ALL
TO authenticated
USING (
  (EXISTS ( SELECT 1
   FROM games g
   WHERE ((g.id = game_participants.game_id) AND
          EXISTS ( SELECT 1
                  FROM members m
                  WHERE ((m.club_id = g.club_id) AND
                         (m.user_id = auth.uid()) AND
                         (m.is_admin = true))))))
);

-- Policy for regular members
alter policy "Allow game participant management"
on "public"."game_participants"
to authenticated
using (
  (EXISTS ( SELECT 1
   FROM games g
   WHERE ((g.id = game_participants.game_id) AND
          EXISTS ( SELECT 1
                  FROM members m
                  WHERE ((m.club_id = g.club_id) AND
                         (m.user_id = auth.uid()) AND
                         (m.status = 'Ativo'::text))))))
);

CREATE POLICY "Allow game statistics management" ON game_statistics
  FOR ALL TO authenticated
  USING ((EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_statistics.game_id
    AND is_club_admin(auth.uid(), games.club_id)
  )));

CREATE POLICY "Allow game statistics management_insert" ON game_statistics
  FOR INSERT TO authenticated
  USING ((EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_statistics.game_id
    AND is_club_admin(auth.uid(), games.club_id)
  )));

CREATE POLICY "Allow game statistics management_update" ON game_statistics
  FOR UPDATE TO authenticated
  USING ((EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_statistics.game_id
    AND is_club_admin(auth.uid(), games.club_id)
  )));

CREATE POLICY "Allow game statistics management_select" ON game_statistics
  FOR SELECT TO authenticated
  USING ((EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_statistics.game_id
    AND is_club_member(auth.uid(), games.club_id)
  )));

CREATE POLICY "Everyone can read monthly fees" ON monthly_fees
  FOR SELECT TO authenticated
  USING ((is_club_member(auth.uid(), club_id)));

CREATE POLICY "Only admins can manage monthly fees_insert" ON monthly_fees
  FOR INSERT TO authenticated
  USING ((is_admin(auth.uid())));

CREATE POLICY "Only admins can manage monthly fees_update" ON monthly_fees
  FOR UPDATE TO authenticated
  USING ((is_admin(auth.uid())));

CREATE POLICY "Only admins can manage monthly fees_delete" ON monthly_fees
  FOR DELETE TO authenticated
  USING ((is_admin(auth.uid())));

CREATE POLICY "Allow admin manage settings" ON club_settings
  FOR ALL TO authenticated
  USING ((is_club_admin(auth.uid(), club_id)));

CREATE POLICY "Allow admin manage settings_insert" ON club_settings
  FOR INSERT TO authenticated
  USING ((is_club_admin(auth.uid(), club_id)));

CREATE POLICY "Allow admin manage settings_update" ON club_settings
  FOR UPDATE TO authenticated
  USING ((is_club_admin(auth.uid(), club_id)));

CREATE POLICY "Allow member read settings" ON club_settings
  FOR SELECT TO authenticated
  USING ((is_club_member(auth.uid(), club_id)));

CREATE POLICY "Everyone can read accounts" ON accounts
  FOR SELECT TO authenticated
  USING ((is_club_member(auth.uid(), club_id)));

CREATE POLICY "Only admins can manage accounts_insert" ON accounts
  FOR INSERT TO authenticated
  USING ((is_admin(auth.uid())));

CREATE POLICY "Only admins can manage accounts_update" ON accounts
  FOR UPDATE TO authenticated
  USING ((is_admin(auth.uid())));

CREATE POLICY "Only admins can manage accounts_delete" ON accounts
  FOR DELETE TO authenticated
  USING ((is_admin(auth.uid())));

CREATE POLICY "Everyone can read transactions" ON transactions
  FOR SELECT TO authenticated
  USING ((is_club_member(auth.uid(), club_id)));

CREATE POLICY "Only admins can manage transactions_insert" ON transactions
  FOR INSERT TO authenticated
  USING ((is_admin(auth.uid())));

CREATE POLICY "Only admins can manage transactions_update" ON transactions
  FOR UPDATE TO authenticated
  USING ((is_admin(auth.uid())));

CREATE POLICY "Only admins can manage transactions_delete" ON transactions
  FOR DELETE TO authenticated
  USING ((is_admin(auth.uid())));

CREATE POLICY "Everyone can read cancellation reasons" ON cancellation_reasons
  FOR SELECT TO authenticated
  USING ((true));

CREATE POLICY "Admins can manage cancellation reasons_insert" ON cancellation_reasons
  FOR INSERT TO authenticated
  USING ((EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.is_admin = true
  )));

CREATE POLICY "Admins can manage cancellation reasons_update" ON cancellation_reasons
  FOR UPDATE TO authenticated
  USING ((EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.is_admin = true
  )));

CREATE POLICY "Admins can manage cancellation reasons_delete" ON cancellation_reasons
  FOR DELETE TO authenticated
  USING ((EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.is_admin = true
  )));

CREATE POLICY "Allow invite creation by admins" ON club_invites
  FOR INSERT TO authenticated
  USING ((EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.is_admin = true
    AND members.club_id = club_invites.club_id
  )));

CREATE POLICY "Allow invite viewing by admins" ON club_invites
  FOR SELECT TO authenticated
  USING ((EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.is_admin = true
    AND members.club_id = club_invites.club_id
  )));

CREATE POLICY "Everyone can read versions" ON versions
  FOR SELECT TO authenticated
  USING ((true));

CREATE POLICY "Only admins can manage versions_insert" ON versions
  FOR INSERT TO authenticated
  USING ((EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.is_admin = true
  )));

CREATE POLICY "Only admins can manage versions_update" ON versions
  FOR UPDATE TO authenticated
  USING ((EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.is_admin = true
  )));

CREATE POLICY "Only admins can manage versions_delete" ON versions
  FOR DELETE TO authenticated
  USING ((EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.is_admin = true
  )));

CREATE POLICY "Users can view own clubs" ON clubs
  FOR SELECT TO authenticated
  USING ((id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
  )));

CREATE POLICY "Allow club management_insert" ON clubs
  FOR INSERT TO authenticated
  USING ((id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
  )));

CREATE POLICY "Allow club management_update" ON clubs
  FOR UPDATE TO authenticated
  USING ((id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
  )));

CREATE POLICY "Allow club management_delete" ON clubs
  FOR DELETE TO authenticated
  USING ((id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
  )));