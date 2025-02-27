-- Create monthly_fees table
CREATE TABLE monthly_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  reference_month date NOT NULL,
  due_date date NOT NULL,
  value numeric(10,2) NOT NULL,
  payment_date date,
  transaction_id uuid REFERENCES transactions(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE monthly_fees ENABLE ROW LEVEL SECURITY;

-- Create policies for monthly_fees
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

-- Add indexes
CREATE INDEX idx_monthly_fees_member_id ON monthly_fees(member_id);
CREATE INDEX idx_monthly_fees_reference_month ON monthly_fees(reference_month);
CREATE INDEX idx_monthly_fees_payment_date ON monthly_fees(payment_date);

-- Add comments
COMMENT ON TABLE monthly_fees IS 'Monthly membership fees';
COMMENT ON COLUMN monthly_fees.reference_month IS 'Month/year this fee refers to';
COMMENT ON COLUMN monthly_fees.due_date IS 'When this fee should be paid';
COMMENT ON COLUMN monthly_fees.payment_date IS 'When this fee was actually paid';
COMMENT ON COLUMN monthly_fees.transaction_id IS 'Reference to the transaction when paid';