/*
  # Add Access Key Setting

  1. New Settings
    - Add access_key setting for user registration control
  
  2. Security
    - Only admins can manage the access key
    - All users can read the setting (but value will be null for non-admins)
*/

-- Insert access key setting
INSERT INTO club_settings (key, name, type, value)
VALUES ('access_key', 'Chave de Acesso', 'text', 'coala2025')
ON CONFLICT (key) DO NOTHING;

-- Add comment explaining the setting
COMMENT ON TABLE club_settings IS 'Stores club configuration and document settings, including access key for registration control';