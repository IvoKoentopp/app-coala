/*
  # Fix Transaction Delete Cascade

  1. Changes
    - Update foreign key constraint on monthly_fees to cascade deletes
    - This ensures when a transaction is deleted, related monthly fee records are updated

  2. Security
    - Maintains existing RLS policies
*/

-- Drop existing foreign key constraint
ALTER TABLE monthly_fees 
  DROP CONSTRAINT IF EXISTS monthly_fees_transaction_id_fkey;

-- Recreate with ON DELETE SET NULL
ALTER TABLE monthly_fees 
  ADD CONSTRAINT monthly_fees_transaction_id_fkey 
  FOREIGN KEY (transaction_id) 
  REFERENCES transactions(id) 
  ON DELETE SET NULL;

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT monthly_fees_transaction_id_fkey ON monthly_fees IS 
  'When a transaction is deleted, set transaction_id to null in related monthly fees';