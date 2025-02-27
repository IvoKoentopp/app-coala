-- Set timezone to America/Sao_Paulo for the database
ALTER DATABASE postgres SET timezone TO 'America/Sao_Paulo';

-- Create a function to convert timestamps to Sao Paulo timezone
CREATE OR REPLACE FUNCTION to_sao_paulo_tz(timestamp with time zone) 
RETURNS timestamp with time zone AS $$
BEGIN
  RETURN $1 AT TIME ZONE 'America/Sao_Paulo';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to format dates in Sao Paulo timezone
CREATE OR REPLACE FUNCTION format_date_sp(date_value date) 
RETURNS text AS $$
BEGIN
  RETURN to_char(date_value AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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

-- Add comments explaining the functions
COMMENT ON FUNCTION to_sao_paulo_tz IS 'Converts timestamp to America/Sao_Paulo timezone';
COMMENT ON FUNCTION format_date_sp IS 'Formats date in DD/MM/YYYY format using Sao Paulo timezone';