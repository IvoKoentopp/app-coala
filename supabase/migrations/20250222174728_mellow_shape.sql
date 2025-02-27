/*
  # Add photo and phone fields to members table

  1. Changes
    - Add `photo_url` column for member profile pictures
    - Add `phone` column for member phone numbers
*/

ALTER TABLE members 
  ADD COLUMN photo_url text,
  ADD COLUMN phone text;