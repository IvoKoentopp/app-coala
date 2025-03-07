/*
  # Temporarily disable admin_users trigger

  1. Changes
    - Drop trigger temporarily
    - Keep view and function intact
    - Manual refresh after update

  2. Security
    - No security changes
    - Keep all existing policies
*/

-- Drop trigger temporarily
DROP TRIGGER IF EXISTS refresh_admin_users_trigger ON members;

-- Refresh view manually
REFRESH MATERIALIZED VIEW admin_users;
