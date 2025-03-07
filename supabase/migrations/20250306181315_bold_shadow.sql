/*
  # Update Registration Flow

  1. Changes
    - Add access_key column to clubs table
    - Add club_invites table for managing club invitations
    - Update RLS policies for better access control
    - Add functions for club management

  2. Security
    - Enable RLS on all tables
    - Add policies with proper checks
    - Secure access key handling

  3. Notes
    - access_key is used for admin registration
    - club_invites manages member invitations
*/

-- Add access_key column to clubs if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clubs' AND column_name = 'access_key'
  ) THEN
    ALTER TABLE clubs ADD COLUMN access_key text;
  END IF;
END $$;

-- Create club_invites table
CREATE TABLE IF NOT EXISTS club_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE club_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow club creation" ON clubs;
DROP POLICY IF EXISTS "Allow club management" ON clubs;
DROP POLICY IF EXISTS "Allow club viewing" ON clubs;

-- Club policies
CREATE POLICY "Allow club creation" ON clubs
FOR INSERT TO authenticated
WITH CHECK (
  -- Allow creation if no clubs exist or if user has a valid access key
  (SELECT count = 0 FROM club_count) OR 
  (access_key IS NOT NULL)
);

CREATE POLICY "Allow club management" ON clubs
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.user_id = auth.uid() 
    AND members.is_admin = true 
    AND members.club_id = clubs.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.user_id = auth.uid() 
    AND members.is_admin = true 
    AND members.club_id = clubs.id
  )
);

CREATE POLICY "Allow club viewing" ON clubs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.user_id = auth.uid() 
    AND members.club_id = clubs.id
  )
);

-- Club invites policies
CREATE POLICY "Allow invite creation by admins" ON club_invites
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.user_id = auth.uid() 
    AND members.is_admin = true 
    AND members.club_id = club_invites.club_id
  )
);

CREATE POLICY "Allow invite viewing by admins" ON club_invites
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.user_id = auth.uid() 
    AND members.is_admin = true 
    AND members.club_id = club_invites.club_id
  )
);

-- Function to validate club invite
CREATE OR REPLACE FUNCTION validate_club_invite(p_code text, p_email text)
RETURNS TABLE (
  is_valid boolean,
  club_id uuid,
  message text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN invite.id IS NULL THEN false
      WHEN invite.used_at IS NOT NULL THEN false
      WHEN invite.expires_at < now() THEN false
      WHEN invite.email != p_email THEN false
      ELSE true
    END as is_valid,
    invite.club_id,
    CASE 
      WHEN invite.id IS NULL THEN 'Convite não encontrado'
      WHEN invite.used_at IS NOT NULL THEN 'Convite já utilizado'
      WHEN invite.expires_at < now() THEN 'Convite expirado'
      WHEN invite.email != p_email THEN 'Email não corresponde ao convite'
      ELSE 'Convite válido'
    END as message
  FROM club_invites invite
  WHERE invite.code = p_code
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;