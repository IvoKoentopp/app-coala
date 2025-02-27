/*
  # Make birth date optional

  1. Changes
    - Remove NOT NULL constraint from birth_date column in members table
    - Add comment explaining the change

  2. Security
    - No security changes required
*/

-- Remove NOT NULL constraint from birth_date
ALTER TABLE members ALTER COLUMN birth_date DROP NOT NULL;

-- Add comment explaining the optional birth date
COMMENT ON COLUMN members.birth_date IS 'Optional birth date for member';