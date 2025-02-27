-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can read transactions" ON transactions;
DROP POLICY IF EXISTS "Only admins can manage transactions" ON transactions;
DROP POLICY IF EXISTS "Everyone can read accounts" ON accounts;
DROP POLICY IF EXISTS "Only admins can manage accounts" ON accounts;
DROP POLICY IF EXISTS "Everyone can read monthly fees" ON monthly_fees;
DROP POLICY IF EXISTS "Only admins can manage monthly fees" ON monthly_fees;

-- Create new policies for accounts
CREATE POLICY "Everyone can read accounts"
  ON accounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage accounts"
  ON accounts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Create new policies for transactions
CREATE POLICY "Everyone can read transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Create new policies for monthly fees
CREATE POLICY "Everyone can read monthly fees"
  ON monthly_fees
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage monthly fees"
  ON monthly_fees
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Add comments explaining the policies
COMMENT ON POLICY "Everyone can read accounts" ON accounts IS 
  'All authenticated users can view accounts';
COMMENT ON POLICY "Only admins can manage accounts" ON accounts IS 
  'Only admin users can create, update, or delete accounts';

COMMENT ON POLICY "Everyone can read transactions" ON transactions IS 
  'All authenticated users can view transactions';
COMMENT ON POLICY "Only admins can manage transactions" ON transactions IS 
  'Only admin users can create, update, or delete transactions';

COMMENT ON POLICY "Everyone can read monthly fees" ON monthly_fees IS 
  'All authenticated users can view monthly fees';
COMMENT ON POLICY "Only admins can manage monthly fees" ON monthly_fees IS 
  'Only admin users can create, update, or delete monthly fees';