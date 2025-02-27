/*
  # Add admin column to members table

  1. Changes
    - Add `is_admin` boolean column to members table with default false
    - Add policy to allow admins to update other members' admin status
    
  2. Security
    - Only admins can update the is_admin column
*/

ALTER TABLE members ADD COLUMN is_admin boolean DEFAULT false;

-- Policy to allow admins to update other members' admin status
CREATE POLICY "Admins can update other members admin status"
  ON members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );