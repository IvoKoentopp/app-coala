/*
  # Add storage bucket for member photos

  1. New Storage
    - Create "members" bucket for storing member photos
  2. Security
    - Enable public access for reading photos
    - Allow authenticated users to upload photos to member-photos directory
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('members', 'members', true);

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'members' AND
  POSITION('member-photos/' in name) = 1 AND
  name ~ '^member-photos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9.]+\.[a-zA-Z]+$'
);

-- Policy to allow public access to read files
CREATE POLICY "Give public access to all files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'members');