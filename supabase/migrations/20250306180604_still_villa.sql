/*
  # Fix RLS Policies for Clubs Table

  1. Security Changes
    - Enable RLS on clubs table
    - Add policy for initial club creation
    - Add policy for admin management
    - Add policy for authenticated users to view their clubs

  2. Changes
    - Drop existing policies to ensure clean state
    - Create materialized view for club count
    - Add new policies with proper permissions
    - Add trigger for maintaining club count
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow initial club creation" ON clubs;
DROP POLICY IF EXISTS "Super admins can manage clubs" ON clubs;
DROP POLICY IF EXISTS "Users can view their own club" ON clubs;

-- Drop existing materialized view if exists
DROP MATERIALIZED VIEW IF EXISTS club_count;

-- Create materialized view for club count
CREATE MATERIALIZED VIEW club_count AS
SELECT COUNT(*) as count FROM clubs;

-- Enable RLS
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Allow initial club creation when no clubs exist
CREATE POLICY "Allow initial club creation" ON clubs
  FOR INSERT TO anon
  WITH CHECK ((SELECT count = 0 FROM club_count));

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

-- Allow authenticated users to view their own club
CREATE POLICY "Users can view their own club" ON clubs
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT club_id 
      FROM members 
      WHERE user_id = auth.uid()
    )
  );

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

-- Initial refresh of club count
REFRESH MATERIALIZED VIEW club_count;