/*
  # Add RLS Policies for Clubs Table

  1. Security
    - Enable RLS on clubs table
    - Add policy for initial club creation (anon)
    - Add policy for admin management of clubs
    - Add policy for authenticated users to view their own club

  2. Changes
    - Enable RLS on clubs table
    - Add 3 new policies for different access levels
    - Add safety checks to prevent duplicate policy errors
*/

-- Enable RLS
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow initial club creation" ON clubs;
  DROP POLICY IF EXISTS "Super admins can manage clubs" ON clubs;
  DROP POLICY IF EXISTS "Users can view their own club" ON clubs;
END $$;

-- Allow initial club creation for anonymous users when no clubs exist
CREATE POLICY "Allow initial club creation" ON clubs
  FOR INSERT TO anon
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM clubs)
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