/*
  # Add status column to games table

  1. Changes
    - Add nullable status column to games table
    - Add index for better query performance

  2. Notes
    - Status is nullable to support games without a status
    - Index improves performance when querying by status
*/

-- Add status column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS status text;

-- Add index for status column
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

COMMENT ON COLUMN games.status IS 'Optional status field for game state tracking';