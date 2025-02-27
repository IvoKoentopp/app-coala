/*
  # Add logo setting

  1. Changes
    - Add logo setting to club_settings table
*/

-- Insert logo setting if it doesn't exist
INSERT INTO club_settings (key, name, type, value)
VALUES ('club_logo', 'Logo', 'file', NULL)
ON CONFLICT (key) DO NOTHING;