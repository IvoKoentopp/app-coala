/*
  # Add game cancellation management
  
  1. Changes
    - Add cancellation_reasons table for tracking game cancellation reasons
    - Add status and cancellation_reason columns to games table
    - Add constraints and policies for managing cancellations
  
  2. Security
    - Enable RLS on cancellation_reasons table
    - Add policies for reading and managing cancellation reasons
    - Ensure only admins can manage cancellation reasons
*/

-- Create cancellation_reasons table if it doesn't exist
CREATE TABLE IF NOT EXISTS cancellation_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reason text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can read cancellation reasons" ON cancellation_reasons;
DROP POLICY IF EXISTS "Admins can manage cancellation reasons" ON cancellation_reasons;

-- Add policies for cancellation_reasons
CREATE POLICY "Everyone can read cancellation reasons"
  ON cancellation_reasons
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cancellation reasons"
  ON cancellation_reasons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND (category = 'Contribuinte' OR is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND (category = 'Contribuinte' OR is_admin = true)
    )
  );

-- Modify games table
DO $$ 
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'status') THEN
    ALTER TABLE games ADD COLUMN status text NOT NULL DEFAULT 'Agendado';
  END IF;

  -- Add cancellation_reason column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE games ADD COLUMN cancellation_reason text;
  END IF;
END $$;

-- Add status check constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'games_status_check') THEN
    ALTER TABLE games ADD CONSTRAINT games_status_check CHECK (status IN ('Agendado', 'Realizado', 'Cancelado'));
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'games_cancellation_reason_fkey') THEN
    ALTER TABLE games ADD CONSTRAINT games_cancellation_reason_fkey FOREIGN KEY (cancellation_reason) REFERENCES cancellation_reasons(reason);
  END IF;
END $$;

-- Insert common cancellation reasons if they don't exist
INSERT INTO cancellation_reasons (reason)
SELECT unnest(ARRAY[
  'Chuva',
  'Campo indisponível',
  'Poucos jogadores',
  'Manutenção do campo',
  'Feriado'
])
ON CONFLICT (reason) DO NOTHING;

-- Add comments
COMMENT ON COLUMN games.status IS 'Game status: Agendado, Realizado, or Cancelado';
COMMENT ON COLUMN games.cancellation_reason IS 'Required when status is Cancelado';

-- Add constraint to ensure cancellation_reason is set when status is Cancelado if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'games_cancellation_reason_required') THEN
    ALTER TABLE games ADD CONSTRAINT games_cancellation_reason_required
    CHECK (
      (status = 'Cancelado' AND cancellation_reason IS NOT NULL) OR
      (status != 'Cancelado' AND cancellation_reason IS NULL)
    );
  END IF;
END $$;