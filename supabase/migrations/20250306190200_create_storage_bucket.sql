/*
  # Create storage bucket for club assets

  1. Changes
    - Create club-assets storage bucket for club logos
    - Add policy to allow authenticated users to read
    - Add policy to allow admins to upload and delete
*/

-- Enable storage by creating the extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "extensions";

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('club-assets', 'club-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view files
CREATE POLICY "Authenticated users can view files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'club-assets');

-- Policy to allow admins to upload files
CREATE POLICY "Admins can upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets' AND
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Policy to allow admins to delete files
CREATE POLICY "Admins can delete files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'club-assets' AND
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Policy to allow admins to update files
CREATE POLICY "Admins can update files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'club-assets' AND
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );
