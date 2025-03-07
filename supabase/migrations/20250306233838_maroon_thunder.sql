/*
  # Remove club count trigger

  1. Changes
    - Remove the refresh_club_count trigger from clubs table
    - Remove the refresh_club_count function
*/

-- Drop the trigger first
DROP TRIGGER IF EXISTS refresh_club_count_trigger ON clubs;

-- Drop the function
DROP FUNCTION IF EXISTS refresh_club_count;