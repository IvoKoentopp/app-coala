/*
  # Add Multi-tenancy Support

  1. New Tables
    - `clubs`
      - `id` (uuid, primary key)
      - `name` (text, club name)
      - `domain` (text, optional custom domain)
      - `logo_url` (text, club logo)
      - `active` (boolean, subscription status)
      - `created_at` (timestamp)
      - `settings` (jsonb, club-specific settings)

  2. Changes
    - Add `club_id` to all relevant tables
    - Update RLS policies for club-specific access
    - Add indexes for performance

  3. Security
    - Enable RLS on clubs table
    - Add policies for club access
    - Modify existing policies to include club_id checks
*/

-- Create clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text UNIQUE,
  logo_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  settings jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT clubs_name_check CHECK (char_length(name) >= 3)
);

-- Enable RLS
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Add club_id to existing tables
ALTER TABLE members ADD COLUMN club_id uuid REFERENCES clubs(id);
ALTER TABLE accounts ADD COLUMN club_id uuid REFERENCES clubs(id);
ALTER TABLE transactions ADD COLUMN club_id uuid REFERENCES clubs(id);
ALTER TABLE games ADD COLUMN club_id uuid REFERENCES clubs(id);
ALTER TABLE monthly_fees ADD COLUMN club_id uuid REFERENCES clubs(id);
ALTER TABLE club_settings ADD COLUMN club_id uuid REFERENCES clubs(id);
ALTER TABLE cancellation_reasons ADD COLUMN club_id uuid REFERENCES clubs(id);
ALTER TABLE versions ADD COLUMN club_id uuid REFERENCES clubs(id);

-- Create indexes
CREATE INDEX idx_members_club_id ON members(club_id);
CREATE INDEX idx_accounts_club_id ON accounts(club_id);
CREATE INDEX idx_transactions_club_id ON transactions(club_id);
CREATE INDEX idx_games_club_id ON games(club_id);
CREATE INDEX idx_monthly_fees_club_id ON monthly_fees(club_id);
CREATE INDEX idx_club_settings_club_id ON club_settings(club_id);
CREATE INDEX idx_cancellation_reasons_club_id ON cancellation_reasons(club_id);
CREATE INDEX idx_versions_club_id ON versions(club_id);

-- Update RLS policies

-- Clubs policies
CREATE POLICY "Users can view their own club"
  ON clubs
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT club_id 
      FROM members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage clubs"
  ON clubs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true 
      AND club_id IS NULL -- Super admin has no club_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true 
      AND club_id IS NULL
    )
  );

-- Update members policies
DROP POLICY IF EXISTS "Everyone can read members" ON members;
DROP POLICY IF EXISTS "Users can create their own member record" ON members;
DROP POLICY IF EXISTS "Users can update their own member record" ON members;
DROP POLICY IF EXISTS "Users can delete their own member record" ON members;
DROP POLICY IF EXISTS "Admins can delete any member" ON members;
DROP POLICY IF EXISTS "Admins can update any member" ON members;

CREATE POLICY "Users can read members from their club"
  ON members
  FOR SELECT
  TO authenticated
  USING (
    club_id IN (
      SELECT club_id 
      FROM members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own member record in their club"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    club_id IN (
      SELECT id 
      FROM clubs 
      WHERE domain = current_setting('request.headers')::json->>'origin'
    )
  );

CREATE POLICY "Users can update their own member record"
  ON members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    club_id IN (
      SELECT club_id 
      FROM members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() AND
    club_id IN (
      SELECT club_id 
      FROM members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Club admins can manage members"
  ON members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true 
      AND club_id = members.club_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true 
      AND club_id = members.club_id
    )
  );

-- Update other table policies similarly
CREATE POLICY "Users can access club settings"
  ON club_settings
  FOR SELECT
  TO authenticated
  USING (
    club_id IN (
      SELECT club_id 
      FROM members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Club admins can manage settings"
  ON club_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true 
      AND club_id = club_settings.club_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true 
      AND club_id = club_settings.club_id
    )
  );

-- Function to get current club_id
CREATE OR REPLACE FUNCTION get_current_club_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT club_id 
    FROM members 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$;