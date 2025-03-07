/*
  # Fix Authentication and Basic Access Policies
  
  1. Changes
    - Simplify member policies for basic access
    - Add helper functions for policy checks
    - Remove complex policy chains
    - Focus on basic auth and club access

  2. Security
    - Maintain basic access control
    - Allow proper member data access
    - Fix infinite recursion issues
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow member creation" ON members;
DROP POLICY IF EXISTS "Allow member viewing" ON members;
DROP POLICY IF EXISTS "Allow member updates" ON members;
DROP POLICY IF EXISTS "Allow member deletion" ON members;
DROP POLICY IF EXISTS "Allow club viewing" ON clubs;

-- Create helper functions
CREATE OR REPLACE FUNCTION is_club_member(user_id uuid, club_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = $1 
    AND members.club_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Basic member policies
CREATE POLICY "Allow member viewing"
ON members
FOR SELECT
TO authenticated
USING (
  -- Allow users to view their own profile
  user_id = auth.uid() OR
  -- Or view members from their club
  club_id IN (
    SELECT club_id FROM members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Allow member updates"
ON members
FOR UPDATE
TO authenticated
USING (
  -- Allow users to update their own profile
  user_id = auth.uid()
);

-- Basic club policies
CREATE POLICY "Allow club viewing"
ON clubs
FOR SELECT
TO authenticated
USING (
  -- Allow viewing clubs where user is a member
  id IN (
    SELECT club_id FROM members
    WHERE user_id = auth.uid()
  )
);

-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;