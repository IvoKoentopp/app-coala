/*
  # Remove anthem features
  
  This migration removes anthem-related settings from the club_settings table
  to simplify the application and remove unused features.
*/

-- Remove anthem-related settings
DELETE FROM club_settings 
WHERE key IN ('club_anthem', 'anthem_lyrics');

-- Add comment explaining the removal
COMMENT ON TABLE club_settings IS 'Stores club configuration and document settings';