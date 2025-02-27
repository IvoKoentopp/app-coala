/*
  # Add Initial Balance Setting

  1. New Settings
    - Add initial_balance setting to club_settings table
    - This will store the starting balance for financial calculations

  2. Security
    - Uses existing RLS policies from club_settings table
*/

-- Insert initial balance setting if it doesn't exist
INSERT INTO club_settings (key, name, type, value)
VALUES ('initial_balance', 'Saldo Inicial', 'text', '0')
ON CONFLICT (key) DO NOTHING;

-- Add comment explaining the setting
COMMENT ON TABLE club_settings IS 'Stores club configuration and document settings, including initial balance for financial calculations';