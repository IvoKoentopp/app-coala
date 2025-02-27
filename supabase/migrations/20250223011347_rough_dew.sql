/*
  # Update games table with new status fields

  1. Changes
    - Drop existing status column
    - Add new status column with specific constraints
    - Add cancellation_reason column
    - Add cancellation_reasons table for storing common reasons

  2. Tables
    - cancellation_reasons
      - id (uuid, primary key)
      - reason (text, unique)
      - created_at (timestamptz)

  3. Security
    - Enable RLS on cancellation_reasons
    - Add policies for reading and managing reasons
*/

-- Create cancellation_reasons table
CREATE TABLE cancellation_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reason text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE games 
  DROP COLUMN IF EXISTS status,
  ADD COLUMN status text NOT NULL DEFAULT 'Agendado' CHECK (status IN ('Agendado', 'Realizado', 'Cancelado')),
  ADD COLUMN cancellation_reason text REFERENCES cancellation_reasons(reason);

-- Add some common cancellation reasons
INSERT INTO cancellation_reasons (reason) VALUES
  ('Chuva'),
  ('Campo indisponível'),
  ('Poucos jogadores'),
  ('Manutenção do campo'),
  ('Feriado');

-- Add comment explaining the status field
COMMENT ON COLUMN games.status IS 'Game status: Agendado, Realizado, or Cancelado';
COMMENT ON COLUMN games.cancellation_reason IS 'Required when status is Cancelado';

-- Add constraint to ensure cancellation_reason is set when status is Cancelado
ALTER TABLE games
  ADD CONSTRAINT games_cancellation_reason_required
  CHECK (
    (status = 'Cancelado' AND cancellation_reason IS NOT NULL) OR
    (status != 'Cancelado' AND cancellation_reason IS NULL)
  );