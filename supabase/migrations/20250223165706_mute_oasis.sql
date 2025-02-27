-- First, update the type check constraint to include new types
ALTER TABLE club_settings
DROP CONSTRAINT IF EXISTS club_settings_type_check;

ALTER TABLE club_settings
ADD CONSTRAINT club_settings_type_check 
CHECK (type IN ('file', 'text', 'html', 'image', 'url'));

-- Add new settings for invitation
INSERT INTO club_settings (key, name, type, value)
VALUES 
  ('invitation_image', 'Imagem do Convite', 'image', NULL),
  ('invitation_url', 'Link do Convite', 'url', NULL)
ON CONFLICT (key) DO NOTHING;

-- Update club_invitation type if it exists
UPDATE club_settings 
SET type = 'file'
WHERE key = 'club_invitation';

-- Add comment explaining the types
COMMENT ON CONSTRAINT club_settings_type_check ON club_settings IS 
  'Ensures setting type is one of: file, text, html, image, or url';