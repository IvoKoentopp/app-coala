/*
  # Fix Clubs Table RLS Policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Add new RLS policies for clubs table:
      - Allow initial club creation for anonymous users when no clubs exist
      - Allow super admins to manage clubs
      - Allow users to view their own club
    - Add materialized view for club count to optimize initial club creation check

  2. Security
    - Enable RLS on clubs table
    - Add policies with proper checks
    - Prevent unauthorized access

  3. Notes
    - The club_count materialized view is used to efficiently check if any clubs exist
    - Super admins are members with is_admin=true and no club_id (system-wide admins)
*/

-- Create materialized view for club count if it doesn't exist
CREATE MATERIALIZED VIEW IF NOT EXISTS club_count AS
SELECT count(*) as count FROM clubs;

-- Create function to refresh club count
CREATE OR REPLACE FUNCTION refresh_club_count()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW club_count;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh club count
DROP TRIGGER IF EXISTS refresh_club_count_trigger ON clubs;
CREATE TRIGGER refresh_club_count_trigger
AFTER INSERT OR DELETE OR UPDATE ON clubs
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_club_count();

-- Enable RLS
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow initial club creation" ON clubs;
DROP POLICY IF EXISTS "Super admins can manage clubs" ON clubs;
DROP POLICY IF EXISTS "Users can view their own club" ON clubs;

-- Allow initial club creation when no clubs exist
CREATE POLICY "Allow initial club creation" ON clubs
FOR INSERT TO anon
WITH CHECK (
  (SELECT count = 0 FROM club_count)
);

-- Allow super admins to manage clubs
CREATE POLICY "Super admins can manage clubs" ON clubs
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.user_id = auth.uid() 
    AND members.is_admin = true 
    AND members.club_id IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.user_id = auth.uid() 
    AND members.is_admin = true 
    AND members.club_id IS NULL
  )
);

-- Allow users to view their own club
CREATE POLICY "Users can view their own club" ON clubs
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT club_id 
    FROM members 
    WHERE members.user_id = auth.uid()
  )
);