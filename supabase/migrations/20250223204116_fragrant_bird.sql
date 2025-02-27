/*
  # Adicionar campos para letra e URL do hino

  1. Novas Configurações
    - `club_anthem_url`: URL do hino (streaming)
    - `club_anthem_lyrics`: Letra do hino (rich text)

  2. Segurança
    - Mantém as políticas RLS existentes da tabela club_settings
*/

-- Adicionar novas configurações para o hino
INSERT INTO club_settings (key, name, type, value)
VALUES 
  ('club_anthem_url', 'URL do Hino', 'url', NULL),
  ('club_anthem_lyrics', 'Letra do Hino', 'html', NULL)
ON CONFLICT (key) DO NOTHING;

-- Adicionar comentários explicativos
COMMENT ON TABLE club_settings IS 'Stores club configuration and document settings. Includes anthem URL and lyrics.';