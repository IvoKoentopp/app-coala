/*
  # Add Access Key Setting

  1. Changes
    - Adds access_key setting to club_settings table
    - Sets default access key value for initial setup
  
  2. Security
    - Access key is protected by existing RLS policies
    - Only admins can view/modify the access key
*/

-- Insert access key setting if it doesn't exist
INSERT INTO club_settings (key, name, type, value)
VALUES ('access_key', 'Chave de Acesso', 'text', 'coala2025')
ON CONFLICT (key) DO NOTHING;

-- Add comment explaining the setting
COMMENT ON TABLE club_settings IS 'Stores club configuration and document settings, including access key for registration control';