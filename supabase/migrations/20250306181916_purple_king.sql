/*
  # Fix Authentication Error Handling

  1. Changes
    - Add better RLS policies for member access
    - Add function to handle member lookup
    - Add function to validate club access
    - Add function to handle user registration

  2. Security
    - Maintain RLS while improving error handling
    - Better member access control
*/

-- Function to get member by user_id
CREATE OR REPLACE FUNCTION get_member_by_user_id(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  nickname text,
  is_admin boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.nickname, m.is_admin
  FROM members m
  WHERE m.user_id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate club access
CREATE OR REPLACE FUNCTION validate_club_access(p_user_id uuid, p_club_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = p_user_id
    AND club_id = p_club_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update members RLS policies
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON members;
CREATE POLICY "Users can view own profile" ON members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid()
      AND m.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON members;
CREATE POLICY "Users can update own profile" ON members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to handle user registration
CREATE OR REPLACE FUNCTION handle_user_registration(
  p_user_id uuid,
  p_name text,
  p_nickname text,
  p_club_id uuid DEFAULT NULL,
  p_is_admin boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
  v_member_id uuid;
BEGIN
  INSERT INTO members (
    user_id,
    name,
    nickname,
    category,
    status,
    is_admin,
    club_id,
    start_month
  ) VALUES (
    p_user_id,
    p_name,
    p_nickname,
    'Contribuinte',
    'Ativo',
    p_is_admin,
    p_club_id,
    CURRENT_DATE
  )
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;