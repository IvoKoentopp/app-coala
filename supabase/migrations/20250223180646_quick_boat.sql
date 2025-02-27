/*
  # Add anthem lyrics setting

  1. Changes
    - Add new anthem_lyrics setting to club_settings table
    - Set type as 'html' to support rich text content
*/

-- Insert anthem lyrics setting if it doesn't exist
INSERT INTO club_settings (key, name, type, value)
VALUES ('anthem_lyrics', 'Letra do Hino', 'html', NULL)
ON CONFLICT (key) DO NOTHING;

-- Add comment explaining the setting
COMMENT ON TABLE club_settings IS 'Stores club configuration and document settings. Club anthem uses URL type for streaming service links and HTML type for lyrics';