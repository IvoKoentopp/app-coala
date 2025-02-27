/*
  # Create auth user data view

  1. Changes
    - Create a secure view for accessing auth.users data
    - Add policies for the view

  2. Security
    - Only expose necessary fields
    - Maintain RLS policies
*/

-- Create a secure view for auth.users data
CREATE VIEW auth_user_data AS
SELECT id, email, email_confirmed_at, last_sign_in_at
FROM auth.users;

-- Enable RLS on the view
ALTER VIEW auth_user_data SET (security_invoker = true);

-- Allow users to view their own auth data
CREATE POLICY "Users can view own auth data"
ON auth_user_data
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

-- Allow admins to view all auth data
CREATE POLICY "Admins can view all auth data"
ON auth_user_data
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);