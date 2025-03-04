import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are not properly configured');
}

// Cliente específico para acesso anônimo
export const supabaseAnon = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: false, // Não persiste a sessão
    autoRefreshToken: false, // Não tenta renovar o token
    detectSessionInUrl: false // Não detecta sessão na URL
  }
});
