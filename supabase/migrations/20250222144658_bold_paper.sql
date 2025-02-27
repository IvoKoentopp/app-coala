/*
  # Create members table for soccer club

  1. New Tables
    - `members`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `nickname` (text, unique)
      - `birth_date` (date)
      - `category` (text)
      - `sponsor_nickname` (text, references members.nickname)
      - `start_month` (date)
      - `payment_start_month` (date)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `members` table
    - Add policies for authenticated users to:
      - Read all members
      - Create their own member record
      - Update their own member record
      - Delete their own member record
*/

CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  nickname text UNIQUE NOT NULL,
  birth_date date NOT NULL,
  category text NOT NULL CHECK (category IN ('Colaborador', 'Contribuinte', 'Convidado')),
  sponsor_nickname text REFERENCES members(nickname),
  start_month date NOT NULL DEFAULT CURRENT_DATE,
  payment_start_month date,
  status text NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Suspenso')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all members"
  ON members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own member record"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own member record"
  ON members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own member record"
  ON members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);