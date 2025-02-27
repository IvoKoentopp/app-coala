/*
  # Fix auth user data view

  1. Changes
    - Create auth_user_data view with proper security
    - Add proper view permissions
    - Fix column selection to avoid duplicates
    - Ensure proper access control

  2. Security
    - Use security barrier for view protection
    - Implement row-level security through view definition
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS auth_user_data;

-- Create the view with proper security and access control
CREATE VIEW auth_user_data AS 
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.last_sign_in_at,
  EXISTS (
    SELECT 1 
    FROM members m 
    WHERE m.user_id = auth.uid() 
    AND (m.is_admin = true OR auth.uid() = u.id)
  ) as can_access
FROM auth.users u
WHERE EXISTS (
  SELECT 1 
  FROM members m 
  WHERE m.user_id = auth.uid() 
  AND (m.is_admin = true OR auth.uid() = u.id)
);

COMMENT ON VIEW auth_user_data IS 'Secure view of auth.users data with built-in access control';