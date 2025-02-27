-- Create version table if it doesn't exist
CREATE TABLE IF NOT EXISTS versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  description text,
  released_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;

-- Create policy for reading versions
CREATE POLICY "Everyone can read versions"
  ON versions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for managing versions
CREATE POLICY "Only admins can manage versions"
  ON versions
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

-- Insert version 1.0.1
INSERT INTO versions (version, description) VALUES (
  '1.0.1',
  'Adicionado sistema de configurações do clube com suporte para documentos (convite, estatuto e hino)'
);