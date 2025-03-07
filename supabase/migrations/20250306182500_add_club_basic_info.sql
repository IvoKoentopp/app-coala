/*
  # Add basic club information settings

  1. Changes
    - Add basic club information settings to club_settings table
    - Set default values for required fields
    
  2. Settings Added:
    - club_name: Nome do clube
    - club_logo: Logo do clube
    - club_description: Descrição do clube
    - club_foundation_date: Data de fundação
    - club_address: Endereço
    - club_phone: Telefone
    - club_email: Email
*/

-- Insert basic club information settings if they don't exist
INSERT INTO club_settings (key, name, type, value)
SELECT * FROM (VALUES
  ('club_name', 'Nome do Clube', 'text', 'Coala Futebol Clube'),
  ('club_logo', 'Logo do Clube', 'image', NULL),
  ('club_description', 'Descrição do Clube', 'html', '<p>Clube de futebol amador fundado por amigos.</p>'),
  ('club_foundation_date', 'Data de Fundação', 'date', CURRENT_DATE::text),
  ('club_address', 'Endereço', 'text', NULL),
  ('club_phone', 'Telefone', 'tel', NULL),
  ('club_email', 'Email', 'email', NULL)
) AS v(key, name, type, value)
WHERE NOT EXISTS (
  SELECT 1 FROM club_settings cs 
  WHERE cs.key = v.key
);
