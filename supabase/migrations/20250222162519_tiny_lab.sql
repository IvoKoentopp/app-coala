/*
  # Sistema de Controle de Jogos

  1. Novas Tabelas
    - `games`
      - `id` (uuid, chave primária)
      - `date` (data do jogo)
      - `field` (campo utilizado)
      - `created_at` (data de criação)
      - `updated_at` (data de atualização)
    
    - `game_participants`
      - `id` (uuid, chave primária)
      - `game_id` (referência ao jogo)
      - `member_id` (referência ao membro)
      - `confirmed` (confirmação de presença)
      - `confirmation_date` (data da confirmação)
      - `created_at` (data de criação)
      - `updated_at` (data de atualização)

  2. Segurança
    - Habilitar RLS em ambas as tabelas
    - Políticas para leitura, criação e atualização
*/

-- Tabela de Jogos
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  field text NOT NULL CHECK (field IN ('Campo Principal', 'Campo de Chuva')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de Participantes do Jogo
CREATE TABLE game_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  confirmed boolean DEFAULT false,
  confirmation_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(game_id, member_id)
);

-- Habilitar RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;

-- Políticas para games
CREATE POLICY "Todos podem ver os jogos"
  ON games
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas administradores podem criar jogos"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND category = 'Colaborador'
    )
  );

-- Políticas para game_participants
CREATE POLICY "Todos podem ver as participações"
  ON game_participants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Membros podem confirmar presença"
  ON game_participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND id = game_participants.member_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND id = game_participants.member_id
    )
  );

CREATE POLICY "Sistema pode criar participações"
  ON game_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE user_id = auth.uid() 
      AND category = 'Colaborador'
    )
  );