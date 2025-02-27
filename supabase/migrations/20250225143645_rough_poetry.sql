-- Add new columns to transactions table if they don't exist
DO $$ 
BEGIN
  -- Add beneficiary column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'beneficiary'
  ) THEN
    ALTER TABLE transactions ADD COLUMN beneficiary text;
  END IF;

  -- Add reference_month column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'reference_month'
  ) THEN
    ALTER TABLE transactions ADD COLUMN reference_month date;
  END IF;

  -- Add index for reference_month if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_transactions_reference_month'
  ) THEN
    CREATE INDEX idx_transactions_reference_month ON transactions(reference_month);
  END IF;
END $$;

-- Add comments for new columns
COMMENT ON COLUMN transactions.beneficiary IS 'Beneficiary of the transaction';
COMMENT ON COLUMN transactions.reference_month IS 'Reference month/year for monthly fees';