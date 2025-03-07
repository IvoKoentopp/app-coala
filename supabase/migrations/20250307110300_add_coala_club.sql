/*
  # Add Coala Club

  1. Changes
    - Create initial club
    - Add club settings with access key
    - Update existing members to use the club
*/

-- Create the Coala club
DO $$
DECLARE
  coala_id uuid;
BEGIN
  -- Insert the club
  INSERT INTO clubs (name, logo_url)
  VALUES ('Coala Futebol Clube', NULL)
  RETURNING id INTO coala_id;

  -- Add club settings
  INSERT INTO club_settings (key, name, type, value, club_id)
  VALUES
    ('access_key', 'Chave de Acesso', 'text', 'n5g2vkav', coala_id),
    ('club_name', 'Nome do Clube', 'text', 'Coala Futebol Clube', coala_id),
    ('club_logo', 'Logo do Clube', 'image', NULL, coala_id),
    ('club_description', 'Descrição do Clube', 'html', '<p>Clube de futebol amador fundado por amigos.</p>', coala_id),
    ('initial_balance', 'Saldo Inicial', 'number', '0', coala_id),
    ('club_anthem_lyrics', 'Letra do Hino', 'html', NULL, coala_id),
    ('club_anthem_url', 'URL do Hino', 'url', NULL, coala_id),
    ('club_statute', 'Estatuto do Clube', 'html', NULL, coala_id),
    ('invitation_image', 'Imagem do Convite', 'image', NULL, coala_id),
    ('club_invitation', 'Convite do Clube', 'file', NULL, coala_id),
    ('invitation_url', 'URL do Convite', 'url', NULL, coala_id);

  -- Update existing members to use this club
  UPDATE members SET club_id = coala_id WHERE club_id IS NULL;

  -- Update existing accounts to use this club
  UPDATE accounts SET club_id = coala_id WHERE club_id IS NULL;

  -- Update existing transactions to use this club
  UPDATE transactions SET club_id = coala_id WHERE club_id IS NULL;

  -- Update existing games to use this club
  UPDATE games SET club_id = coala_id WHERE club_id IS NULL;

  -- Update existing monthly_fees to use this club
  UPDATE monthly_fees SET club_id = coala_id WHERE club_id IS NULL;

  -- Update existing cancellation_reasons to use this club
  UPDATE cancellation_reasons SET club_id = coala_id WHERE club_id IS NULL;

  -- Update existing versions to use this club
  UPDATE versions SET club_id = coala_id WHERE club_id IS NULL;
END $$;
