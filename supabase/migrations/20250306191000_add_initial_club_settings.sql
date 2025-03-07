/*
  # Add initial club settings

  1. Changes
    - Add initial club settings for name, logo, and description
    - Set default values for required fields
    
  2. Settings Added:
    - club_name: Nome do clube
    - club_logo: Logo do clube
    - club_description: Descrição do clube
*/

-- Insert initial club settings if they don't exist
INSERT INTO club_settings (key, name, type, value)
SELECT * FROM (VALUES
  ('club_name', 'Nome do Clube', 'text', 'Coala Futebol Clube'),
  ('club_logo', 'Logo do Clube', 'image', NULL),
  ('club_description', 'Descrição do Clube', 'html', '<p>Clube de futebol amador fundado por amigos.</p>')
) AS v(key, name, type, value)
WHERE NOT EXISTS (
  SELECT 1 FROM club_settings cs 
  WHERE cs.key = v.key
);
