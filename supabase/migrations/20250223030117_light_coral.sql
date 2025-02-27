/*
  # Club Settings and Documents Management

  1. New Tables
    - `club_settings`
      - `id` (uuid, primary key)
      - `key` (text, unique) - Setting identifier
      - `name` (text) - Display name
      - `type` (text) - Setting type (file, text, etc)
      - `value` (text) - Setting value or file URL
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `club_settings` table
    - Add policies for read/write access
*/

-- Create club_settings table
CREATE TABLE club_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('file', 'text', 'html')),
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE club_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can read club settings"
  ON club_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify club settings"
  ON club_settings
  FOR ALL
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

-- Create storage bucket for club documents if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('club-documents', 'club-documents', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Create policy for club documents storage
CREATE POLICY "Public can read club documents"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'club-documents');

CREATE POLICY "Only admins can manage club documents"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'club-documents' AND
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  )
  WITH CHECK (
    bucket_id = 'club-documents' AND
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Insert initial settings
INSERT INTO club_settings (key, name, type, value) VALUES
  ('club_invitation', 'Convite', 'file', NULL),
  ('club_statute', 'Estatuto', 'file', NULL),
  ('club_anthem', 'Hino', 'file', NULL);

-- Add comments
COMMENT ON TABLE club_settings IS 'Stores club configuration and document settings';
COMMENT ON COLUMN club_settings.key IS 'Unique identifier for the setting';
COMMENT ON COLUMN club_settings.type IS 'Type of setting: file, text, or html';
COMMENT ON COLUMN club_settings.value IS 'Setting value or file URL';