const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não encontradas!');
}

// Determina a URL do site baseado no ambiente
const getSiteUrl = () => {
  // Se estiver rodando localmente
  if (window.location.hostname === 'localhost') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  // Em produção
  return 'https://beamish-lolly-bf0883.netlify.app';
};

export const config = {
  siteUrl: getSiteUrl(),
  supabaseUrl,
  supabaseAnonKey,
};
