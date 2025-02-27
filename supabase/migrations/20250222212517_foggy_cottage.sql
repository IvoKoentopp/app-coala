/*
  # Update member deletion policy

  1. Changes
    - Update the member deletion policy to allow admins to delete any member
    - Keep the existing policy for users to delete their own records

  2. Security
    - Only admins can delete any member
    - Regular users can only delete their own records
*/

-- Drop the existing deletion policy
DROP POLICY IF EXISTS "Users can delete their own member record" ON members;

-- Create new deletion policies
CREATE POLICY "Users can delete their own member record"
  ON members
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
  );

CREATE POLICY "Admins can delete any member"
  ON members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members AS m
      WHERE m.user_id = auth.uid()
      AND m.is_admin = true
    )
  );