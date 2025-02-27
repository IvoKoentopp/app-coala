/*
  # Corrigir políticas de permissão para jogos

  1. Alterações
    - Adicionar política para permitir que administradores atualizem jogos
    - Remover restrição de categoria para permitir que qualquer admin possa gerenciar jogos
    
  2. Segurança
    - Manter RLS ativo
    - Garantir que apenas admins possam atualizar jogos
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can update games" ON games;

-- Create policy for admins to update games
CREATE POLICY "Admins can update games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Update existing policies to use is_admin instead of category
DROP POLICY IF EXISTS "Apenas administradores podem criar jogos" ON games;
CREATE POLICY "Apenas administradores podem criar jogos"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete games" ON games;
CREATE POLICY "Admins can delete games"
  ON games
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );