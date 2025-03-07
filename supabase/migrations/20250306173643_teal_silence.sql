/*
  # Setup Coala Country Club

  1. Changes
    - Insert Coala Country Club record
    - Update existing records with Coala's club_id
    - Set NOT NULL constraint on club_id columns after data migration

  2. Security
    - Ensure all data is properly associated with the club
*/

-- Insert Coala Country Club
INSERT INTO clubs (id, name, domain, logo_url, active)
VALUES (
  'c0a1a000-0000-4000-a000-000000000000',
  'Coala Country Club',
  'gleeful-boba-44f6c3.netlify.app',
  'https://raw.githubusercontent.com/IvoKoentopp/coala/main/koala-soccer.png',
  true
)
ON CONFLICT (domain) DO NOTHING;

-- Update existing records with Coala's club_id
DO $$ 
DECLARE
  coala_id uuid := 'c0a1a000-0000-4000-a000-000000000000';
BEGIN
  -- Update members
  UPDATE members SET club_id = coala_id WHERE club_id IS NULL;
  
  -- Update accounts
  UPDATE accounts SET club_id = coala_id WHERE club_id IS NULL;
  
  -- Update transactions
  UPDATE transactions SET club_id = coala_id WHERE club_id IS NULL;
  
  -- Update games
  UPDATE games SET club_id = coala_id WHERE club_id IS NULL;
  
  -- Update monthly_fees
  UPDATE monthly_fees SET club_id = coala_id WHERE club_id IS NULL;
  
  -- Update club_settings
  UPDATE club_settings SET club_id = coala_id WHERE club_id IS NULL;
  
  -- Update cancellation_reasons
  UPDATE cancellation_reasons SET club_id = coala_id WHERE club_id IS NULL;
  
  -- Update versions
  UPDATE versions SET club_id = coala_id WHERE club_id IS NULL;
END $$;

-- Add NOT NULL constraints after data migration
DO $$ 
BEGIN
  -- members
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'members' 
    AND column_name = 'club_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE members ALTER COLUMN club_id SET NOT NULL;
  END IF;

  -- accounts
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' 
    AND column_name = 'club_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE accounts ALTER COLUMN club_id SET NOT NULL;
  END IF;

  -- transactions
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'club_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE transactions ALTER COLUMN club_id SET NOT NULL;
  END IF;

  -- games
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' 
    AND column_name = 'club_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE games ALTER COLUMN club_id SET NOT NULL;
  END IF;

  -- monthly_fees
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'monthly_fees' 
    AND column_name = 'club_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE monthly_fees ALTER COLUMN club_id SET NOT NULL;
  END IF;

  -- club_settings
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'club_settings' 
    AND column_name = 'club_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE club_settings ALTER COLUMN club_id SET NOT NULL;
  END IF;

  -- cancellation_reasons
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cancellation_reasons' 
    AND column_name = 'club_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE cancellation_reasons ALTER COLUMN club_id SET NOT NULL;
  END IF;

  -- versions
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'versions' 
    AND column_name = 'club_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE versions ALTER COLUMN club_id SET NOT NULL;
  END IF;
END $$;