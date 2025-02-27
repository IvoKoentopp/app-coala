/*
  # Update default member category

  1. Changes
    - Update the default category for new members to 'Contribuinte'
    - Add a trigger to set 'Contribuinte' as default category

  2. Security
    - No changes to existing security policies
*/

-- Update the check constraint to ensure Contribuinte is the default
ALTER TABLE members
DROP CONSTRAINT members_category_check,
ADD CONSTRAINT members_category_check 
  CHECK (category IN ('Colaborador', 'Contribuinte', 'Convidado'));

-- Create a function to set default category
CREATE OR REPLACE FUNCTION set_default_category()
RETURNS trigger AS $$
BEGIN
  IF NEW.category IS NULL THEN
    NEW.category := 'Contribuinte';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to set default category
DROP TRIGGER IF EXISTS set_default_category_trigger ON members;
CREATE TRIGGER set_default_category_trigger
  BEFORE INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION set_default_category();