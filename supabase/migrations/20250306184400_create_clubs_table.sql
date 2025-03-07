/*
  # Create clubs table

  1. New Table
    - `clubs`
      - `id` (uuid, primary key)
      - `name` (text, club name)
      - `domain` (text, club domain)
      - `logo` (text, logo URL)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text UNIQUE NOT NULL,
  logo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view clubs"
  ON clubs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert clubs"
  ON clubs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

CREATE POLICY "Only admins can update clubs"
  ON clubs
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

-- Insert initial club if it doesn't exist
INSERT INTO clubs (name, domain, logo)
SELECT 'Coala Futebol Clube', 'coala.club', NULL
WHERE NOT EXISTS (SELECT 1 FROM clubs LIMIT 1);
