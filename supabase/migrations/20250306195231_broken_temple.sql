/*
  # Fix ambiguous user_id references

  1. Changes
    - Update RLS policies to properly qualify user_id references
    - Fix ambiguous column references in policies
    - Ensure consistent access control

  2. Security
    - Maintains existing security model
    - Clarifies policy definitions
    - No changes to access levels
*/

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Allow club creation" ON clubs;
DROP POLICY IF EXISTS "Only admins can manage accounts" ON accounts;
DROP POLICY IF EXISTS "Only admins can manage monthly fees" ON monthly_fees;
DROP POLICY IF EXISTS "Only admins can manage transactions" ON transactions;
DROP POLICY IF EXISTS "Only admins can manage versions" ON versions;
DROP POLICY IF EXISTS "Admins can manage cancellation reasons" ON cancellation_reasons;

-- Recreate policies with properly qualified user_id references
CREATE POLICY "Allow club creation" ON clubs
  WITH CHECK (
    ((SELECT count FROM club_count) = 0) OR 
    (access_key IS NOT NULL) OR 
    check_admin_access(auth.uid())
  );

CREATE POLICY "Only admins can manage accounts" ON accounts
  USING (check_admin_access(auth.uid()))
  WITH CHECK (check_admin_access(auth.uid()));

CREATE POLICY "Only admins can manage monthly fees" ON monthly_fees
  USING (check_admin_access(auth.uid()))
  WITH CHECK (check_admin_access(auth.uid()));

CREATE POLICY "Only admins can manage transactions" ON transactions
  USING (check_admin_access(auth.uid()))
  WITH CHECK (check_admin_access(auth.uid()));

CREATE POLICY "Only admins can manage versions" ON versions
  USING (check_admin_access(auth.uid()))
  WITH CHECK (check_admin_access(auth.uid()));

CREATE POLICY "Admins can manage cancellation reasons" ON cancellation_reasons
  USING (check_admin_access(auth.uid()))
  WITH CHECK (check_admin_access(auth.uid()));

-- Refresh the materialized views to ensure they have the latest data
REFRESH MATERIALIZED VIEW club_count;
REFRESH MATERIALIZED VIEW admin_users;