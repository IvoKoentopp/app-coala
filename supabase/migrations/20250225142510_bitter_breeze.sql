-- Add new columns to transactions table
ALTER TABLE transactions 
  ADD COLUMN beneficiary text,
  ADD COLUMN reference_month date;

-- Add comment explaining the new fields
COMMENT ON COLUMN transactions.beneficiary IS 'Beneficiary of the transaction';
COMMENT ON COLUMN transactions.reference_month IS 'Reference month/year for monthly fees';

-- Add index for reference_month to improve queries
CREATE INDEX idx_transactions_reference_month ON transactions(reference_month);