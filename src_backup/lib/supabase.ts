import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dwdnpytzudczbkvynwat.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3ZG5weXR6dWRjemJrdnlud2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMzU4NDcsImV4cCI6MjA1NTgxMTg0N30.7zkRiH95_bZyswOKoMBIfPfDHprkqxy28wck4eocYoI';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro crítico: Configurações do Supabase ausentes!', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  });
}

// Configuração simples do cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection function with better error handling
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Supabase connection error:', err);
    return false;
  }
};

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Debug function to listar todos os membros
export async function listAllMembers() {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('nickname');

    if (error) {
      console.error('Erro ao listar membros:', error);
      return { data: null, error };
    }

    console.log('Lista de todos os membros:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Erro inesperado ao listar membros:', error);
    return { data: null, error };
  }
}

// Função para buscar membro por apelido
export async function findMemberByNickname(nickname: string) {
  if (!nickname) {
    console.error('Apelido não fornecido');
    return { data: null, error: 'Apelido não fornecido' };
  }

  const nicknameToSearch = nickname.trim();
  console.log('Buscando membro com apelido:', nicknameToSearch);
  
  try {
    // Primeiro tenta busca exata
    const { data: exactMatch, error: exactError } = await supabase
      .from('members')
      .select('*')
      .eq('nickname', nicknameToSearch)
      .single();

    console.log('Resultado da busca exata:', exactMatch);

    if (!exactError && exactMatch) {
      return { data: exactMatch, error: null };
    }

    console.log('Tentando busca case insensitive');
    // Se não encontrar, tenta busca case insensitive
    const { data: members, error: searchError } = await supabase
      .from('members')
      .select('*')
      .ilike('nickname', nicknameToSearch);

    console.log('Resultado da busca case insensitive:', members);

    if (searchError) {
      console.error('Erro na busca por apelido:', searchError);
      return { data: null, error: searchError };
    }

    if (!members || members.length === 0) {
      console.log(`Nenhum membro encontrado com o apelido: ${nicknameToSearch}`);
      return { data: null, error: null };
    }

    return { data: members[0], error: null };
  } catch (error) {
    console.error('Erro inesperado na busca por apelido:', error);
    return { data: null, error };
  }
}