/*
  # Fix auth_user_data view security

  1. Changes
    - Recreate auth_user_data view with built-in security checks
    - Remove RLS enablement (not supported for views)
    - Add proper access control in the view definition

  2. Security
    - Users can only see their own email
    - Admins can see all emails
*/

-- Drop existing view
DROP VIEW IF EXISTS auth_user_data;

-- Create secure view with built-in access control
CREATE OR REPLACE VIEW auth_user_data AS 
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.last_sign_in_at
FROM auth.users u
WHERE 
  -- Allow access if:
  -- 1. The user is accessing their own data
  -- 2. The user is an admin
  auth.uid() = u.id 
  OR EXISTS (
    SELECT 1 
    FROM members m 
    WHERE m.user_id = auth.uid() 
    AND m.is_admin = true
  );

COMMENT ON VIEW auth_user_data IS 'Secure view of auth.users data with built-in access control';