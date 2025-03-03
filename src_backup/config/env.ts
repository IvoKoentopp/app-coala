const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não encontradas!');
}

export const config = {
  siteUrl: 'https://beamish-lolly-bf0883.netlify.app',
  supabaseUrl,
  supabaseAnonKey,
};
