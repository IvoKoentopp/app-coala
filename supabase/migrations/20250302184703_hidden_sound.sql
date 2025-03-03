-- Add team column to game_participants table
ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS team text;

-- Add comment explaining the team field
COMMENT ON COLUMN game_participants.team IS 'Team assignment (A or B) for game participants';

-- Add index for team column to improve query performance
CREATE INDEX IF NOT EXISTS idx_game_participants_team ON game_participants(team);

-- Add constraint to ensure team is either A, B, or null
ALTER TABLE game_participants DROP CONSTRAINT IF EXISTS game_participants_team_check;
ALTER TABLE game_participants ADD CONSTRAINT game_participants_team_check 
  CHECK (team IS NULL OR team IN ('A', 'B'));