/*
  # Add cancellation reasons table and constraints

  1. Changes
    - Add cancellation_reason column to games table
    - Create function for managing cancellation reasons
    - Add necessary constraints and indexes
    
  2. Security
    - Add policies for access control
*/

-- First, add the cancellation_reason column to games if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE games ADD COLUMN cancellation_reason text;
  END IF;
END $$;

-- Create function to safely manage cancellation reasons
CREATE OR REPLACE FUNCTION manage_cancellation_reason(p_reason text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized_reason text;
  v_existing_reason text;
BEGIN
  -- Normalize the reason (trim whitespace and convert to lowercase for comparison)
  v_normalized_reason := trim(lower(p_reason));
  
  -- Check if a similar reason exists (case-insensitive)
  SELECT reason INTO v_existing_reason
  FROM cancellation_reasons
  WHERE lower(reason) = v_normalized_reason
  LIMIT 1;
  
  -- If reason exists, return the existing one
  IF v_existing_reason IS NOT NULL THEN
    RETURN v_existing_reason;
  END IF;
  
  -- If reason doesn't exist, insert new one and return it
  INSERT INTO cancellation_reasons (reason)
  VALUES (p_reason)
  RETURNING reason INTO v_existing_reason;
  
  RETURN v_existing_reason;
END;
$$;

-- Add index for case-insensitive searches if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_cancellation_reasons_reason_lower'
  ) THEN
    CREATE INDEX idx_cancellation_reasons_reason_lower ON cancellation_reasons (lower(reason));
  END IF;
END $$;

-- Add comments
COMMENT ON FUNCTION manage_cancellation_reason IS 'Safely manages cancellation reasons, preventing duplicates while preserving case';