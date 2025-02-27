/*
  # Fix game deletion

  1. Changes
    - Add ON DELETE CASCADE to game_participants foreign key
    - Update RLS policies for game deletion
    - Add explicit delete policy for games

  2. Security
    - Only admins can delete games
    - Cascading delete for participants
*/

-- Drop existing foreign key constraint
ALTER TABLE game_participants DROP CONSTRAINT IF EXISTS game_participants_game_id_fkey;

-- Recreate with CASCADE
ALTER TABLE game_participants 
  ADD CONSTRAINT game_participants_game_id_fkey 
  FOREIGN KEY (game_id) 
  REFERENCES games(id) 
  ON DELETE CASCADE;

-- Update game deletion policy
DROP POLICY IF EXISTS "Admins can delete games" ON games;
CREATE POLICY "Admins can delete games"
  ON games
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND category = 'Contribuinte'
    )
  );

-- Add index to improve join performance
CREATE INDEX IF NOT EXISTS idx_game_participants_game_id ON game_participants(game_id);