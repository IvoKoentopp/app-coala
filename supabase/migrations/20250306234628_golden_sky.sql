/*
  # Fix admin users view and trigger function

  1. Changes
    - Drop existing trigger and function
    - Create admin_users materialized view
    - Add refresh function with proper trigger return type
    - Create trigger to refresh view on member changes
    - Set up RLS policies and permissions

  2. Security
    - Enable RLS on materialized view
    - Grant proper permissions to authenticated users
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS refresh_admin_users_trigger ON members;

-- Then drop the function
DROP FUNCTION IF EXISTS public.refresh_admin_users();

-- Create materialized view for admin users
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_users AS
SELECT user_id
FROM members
WHERE is_admin = true;

-- Create refresh function with proper security and trigger return type
CREATE OR REPLACE FUNCTION public.refresh_admin_users()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_users;
  RETURN NULL; -- for AFTER triggers
END;
$$;

-- Create trigger to refresh view on member changes
CREATE TRIGGER refresh_admin_users_trigger
  AFTER INSERT OR DELETE OR UPDATE ON members
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_admin_users();

-- Set up RLS policies
ALTER MATERIALIZED VIEW admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant necessary permissions
GRANT SELECT ON admin_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_admin_users() TO authenticated;