-- Create game_statistics table
CREATE TABLE game_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  statistic_type text NOT NULL CHECK (statistic_type IN ('goal', 'own_goal', 'save', 'assist')),
  assist_by uuid REFERENCES members(id) ON DELETE SET NULL,
  team text CHECK (team IN ('A', 'B')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE game_statistics ENABLE ROW LEVEL SECURITY;

-- Create policies for game_statistics
CREATE POLICY "Everyone can read game statistics"
  ON game_statistics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage game statistics"
  ON game_statistics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Add indexes
CREATE INDEX idx_game_statistics_game_id ON game_statistics(game_id);
CREATE INDEX idx_game_statistics_member_id ON game_statistics(member_id);
CREATE INDEX idx_game_statistics_statistic_type ON game_statistics(statistic_type);
CREATE INDEX idx_game_statistics_team ON game_statistics(team);

-- Add comments
COMMENT ON TABLE game_statistics IS 'Statistics for games including goals, saves, and assists';
COMMENT ON COLUMN game_statistics.statistic_type IS 'Type of statistic: goal, own_goal, save, or assist';
COMMENT ON COLUMN game_statistics.assist_by IS 'Member who provided the assist (for goals only)';
COMMENT ON COLUMN game_statistics.team IS 'Team (A or B) the member was on when the statistic occurred';