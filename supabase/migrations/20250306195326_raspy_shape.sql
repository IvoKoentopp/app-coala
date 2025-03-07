/*
  # Fix user_id ambiguity in RLS policies

  1. Changes
    - Update RLS policies to properly qualify user_id references
    - Fix ambiguous column references in policies
    - Add proper table aliases to avoid ambiguity

  2. Security
    - Maintains existing security model
    - Clarifies policy definitions
    - No changes to access levels
*/

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Everyone can read accounts" ON accounts;
DROP POLICY IF EXISTS "Only admins can manage accounts" ON accounts;
DROP POLICY IF EXISTS "Everyone can read monthly fees" ON monthly_fees;
DROP POLICY IF EXISTS "Only admins can manage monthly fees" ON monthly_fees;

-- Recreate policies with properly qualified user_id references
CREATE POLICY "Everyone can read accounts" ON accounts
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND m.club_id = accounts.club_id
  ));

CREATE POLICY "Only admins can manage accounts" ON accounts
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND m.is_admin = true
    AND m.club_id = accounts.club_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND m.is_admin = true
    AND m.club_id = accounts.club_id
  ));

CREATE POLICY "Everyone can read monthly fees" ON monthly_fees
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND m.club_id = monthly_fees.club_id
  ));

CREATE POLICY "Only admins can manage monthly fees" ON monthly_fees
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND m.is_admin = true
    AND m.club_id = monthly_fees.club_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = auth.uid()
    AND m.is_admin = true
    AND m.club_id = monthly_fees.club_id
  ));

-- Update check_admin_access function to use proper table alias
CREATE OR REPLACE FUNCTION check_admin_access(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members m
    WHERE m.user_id = $1 
    AND m.is_admin = true
    AND m.status = 'Ativo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh materialized views to ensure they have the latest data
REFRESH MATERIALIZED VIEW club_count;
REFRESH MATERIALIZED VIEW admin_users;