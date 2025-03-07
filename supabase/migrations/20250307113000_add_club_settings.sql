-- Adiciona configurações básicas do clube
INSERT INTO public.club_settings (club_id, key, value, type, name)
VALUES 
  -- Chave de acesso
  ('00000000-0000-0000-0000-000000000001', 'access_key', 'n5g2vkav', 'text', 'Chave de Acesso'),
  
  -- Saldo inicial
  ('00000000-0000-0000-0000-000000000001', 'initial_balance', '0', 'text', 'Saldo Inicial'),
  
  -- Configurações de mídia
  ('00000000-0000-0000-0000-000000000001', 'club_logo', '', 'image', 'Logo do Clube'),
  ('00000000-0000-0000-0000-000000000001', 'invitation_image', '', 'image', 'Imagem do Convite'),
  ('00000000-0000-0000-0000-000000000001', 'club_invitation', '', 'file', 'Convite do Clube (PDF)'),
  ('00000000-0000-0000-0000-000000000001', 'invitation_url', '', 'url', 'Link do Convite'),
  
  -- Identidade do clube
  ('00000000-0000-0000-0000-000000000001', 'club_anthem_lyrics', '', 'text', 'Letra do Hino'),
  ('00000000-0000-0000-0000-000000000001', 'club_anthem_url', '', 'url', 'Áudio do Hino'),
  ('00000000-0000-0000-0000-000000000001', 'club_statute', '', 'html', 'Estatuto do Clube');
