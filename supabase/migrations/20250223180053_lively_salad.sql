-- Update club_anthem setting type to URL
UPDATE club_settings 
SET type = 'url'
WHERE key = 'club_anthem';

-- Add comment explaining the change
COMMENT ON TABLE club_settings IS 'Stores club configuration and document settings. Club anthem uses URL type for streaming service links';