/*
  # Fix game confirmation permissions

  1. Changes
    - Update game_participants policies to allow admins to update any confirmation
    - Add policy for admins to manage all game participants

  2. Security
    - Admins (Contribuinte category) can update any game confirmation
    - Regular members can only update their own confirmations
*/

-- Drop existing update policy
DROP POLICY IF EXISTS "Membros podem confirmar presença" ON game_participants;

-- Create new policies for game confirmations
CREATE POLICY "Members can confirm own presence"
  ON game_participants
  FOR UPDATE
  TO authenticated
  USING (
    -- Member updating their own confirmation
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND id = game_participants.member_id
    )
    OR
    -- Admin updating any confirmation
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND category = 'Contribuinte'
    )
  )
  WITH CHECK (
    -- Member updating their own confirmation
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND id = game_participants.member_id
    )
    OR
    -- Admin updating any confirmation
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND category = 'Contribuinte'
    )
  );

-- Add index to improve performance
CREATE INDEX IF NOT EXISTS idx_game_participants_member_id ON game_participants(member_id);