-- Create function to safely get club settings
CREATE OR REPLACE FUNCTION get_club_setting(p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_value text;
BEGIN
  SELECT value INTO v_value
  FROM club_settings
  WHERE key = p_key
  LIMIT 1;
  
  RETURN v_value;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION get_club_setting IS 'Safely retrieves a club setting value by key';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_club_setting TO authenticated;