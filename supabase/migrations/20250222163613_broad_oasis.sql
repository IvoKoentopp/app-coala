/*
  # Update admin policies to use Contribuinte category

  1. Changes
    - Update game policies to use Contribuinte as admin category
    - Update game_participants policies to use Contribuinte as admin category

  2. Security
    - Maintains same security model but changes admin category from Colaborador to Contribuinte
*/

-- Update games policies
DROP POLICY IF EXISTS "Apenas administradores podem criar jogos" ON games;
CREATE POLICY "Apenas administradores podem criar jogos"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND category = 'Contribuinte'
    )
  );

-- Update game_participants policies
DROP POLICY IF EXISTS "Sistema pode criar participações" ON game_participants;
CREATE POLICY "Sistema pode criar participações"
  ON game_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND category = 'Contribuinte'
    )
  );