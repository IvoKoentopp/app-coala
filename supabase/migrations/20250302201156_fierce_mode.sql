/*
  # Add guest players support

  1. Changes
     - Modify user_id constraint to allow null values for guest players
     - Add check constraint to ensure regular members have user_id
     - Add function to create or get guest players
*/

-- First, modify the user_id constraint to allow null for guest players
ALTER TABLE members 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add a check constraint to ensure regular members have user_id
ALTER TABLE members
  ADD CONSTRAINT members_user_id_required_for_regular
  CHECK (
    (category = 'Convidado' OR user_id IS NOT NULL)
  );

-- Create function to get or create guest player
CREATE OR REPLACE FUNCTION get_or_create_guest_player(p_nickname text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id uuid;
BEGIN
  -- Check if guest already exists
  SELECT id INTO v_member_id
  FROM members
  WHERE nickname = p_nickname
  AND category = 'Convidado'
  LIMIT 1;
  
  -- If guest doesn't exist, create it
  IF v_member_id IS NULL THEN
    INSERT INTO members (
      name,
      nickname,
      category,
      status,
      start_month
    ) VALUES (
      p_nickname,
      p_nickname,
      'Convidado',
      'Ativo',
      CURRENT_DATE
    )
    RETURNING id INTO v_member_id;
  END IF;
  
  RETURN v_member_id;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION get_or_create_guest_player IS 'Gets an existing guest player or creates a new one if it doesn''t exist';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_guest_player TO authenticated;

-- Create initial guest players if they don't exist
DO $$
BEGIN
  PERFORM get_or_create_guest_player('Convidado 1');
  PERFORM get_or_create_guest_player('Convidado 2');
END $$;