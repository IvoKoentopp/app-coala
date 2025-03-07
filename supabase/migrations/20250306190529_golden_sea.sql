/*
  # Update admin function and policies

  1. Changes
    - Create new admin check function
    - Create or replace policies with improved implementation
    - Maintain existing security model

  2. Security
    - Policies use the new admin check function
    - Maintain proper access control
    - No data loss
*/

-- Create new admin check function
CREATE OR REPLACE FUNCTION check_admin_access(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = $1 
    AND is_admin = true
    AND status = 'Ativo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace policies using new function
DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow club creation" ON clubs;
  DROP POLICY IF EXISTS "Only admins can manage accounts" ON accounts;
  DROP POLICY IF EXISTS "Only admins can manage monthly fees" ON monthly_fees;
  DROP POLICY IF EXISTS "Only admins can manage transactions" ON transactions;
  DROP POLICY IF EXISTS "Only admins can manage versions" ON versions;
  DROP POLICY IF EXISTS "Admins can manage cancellation reasons" ON cancellation_reasons;

  -- Create new policies
  CREATE POLICY "Allow club creation" ON clubs
    FOR ALL
    TO authenticated
    WITH CHECK (
      ((SELECT count FROM club_count) = 0) OR 
      (access_key IS NOT NULL) OR 
      check_admin_access(auth.uid())
    );

  CREATE POLICY "Only admins can manage accounts" ON accounts
    FOR ALL
    TO authenticated
    USING (check_admin_access(auth.uid()))
    WITH CHECK (check_admin_access(auth.uid()));

  CREATE POLICY "Only admins can manage monthly fees" ON monthly_fees
    FOR ALL
    TO authenticated
    USING (check_admin_access(auth.uid()))
    WITH CHECK (check_admin_access(auth.uid()));

  CREATE POLICY "Only admins can manage transactions" ON transactions
    FOR ALL
    TO authenticated
    USING (check_admin_access(auth.uid()))
    WITH CHECK (check_admin_access(auth.uid()));

  CREATE POLICY "Only admins can manage versions" ON versions
    FOR ALL
    TO authenticated
    USING (check_admin_access(auth.uid()))
    WITH CHECK (check_admin_access(auth.uid()));

  CREATE POLICY "Admins can manage cancellation reasons" ON cancellation_reasons
    FOR ALL
    TO authenticated
    USING (check_admin_access(auth.uid()))
    WITH CHECK (check_admin_access(auth.uid()));
END $$;