-- Set timezone to America/Sao_Paulo for the database
ALTER DATABASE postgres SET timezone TO 'America/Sao_Paulo';

-- Create a function to convert timestamps to Sao Paulo timezone
CREATE OR REPLACE FUNCTION to_sao_paulo_tz(timestamp) RETURNS timestamp AS $$
  SELECT $1 AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo';
$$ LANGUAGE SQL IMMUTABLE;

-- Add comment explaining the timezone configuration
COMMENT ON FUNCTION to_sao_paulo_tz IS 'Converts UTC timestamp to America/Sao_Paulo timezone';