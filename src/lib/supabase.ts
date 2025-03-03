import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a singleton instance
let supabaseInstance: ReturnType<typeof createClient>;

// Initialize Supabase client with error handling
const initSupabase = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are not properly configured');
    // Return a mock client that logs errors instead of throwing them
    return createClient('https://placeholder.supabase.co', 'placeholder', {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'coala-club-auth',
      },
      global: {
        headers: { 
          'x-application-name': 'coala-club',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      },
    });
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'coala-club-auth',
      },
      global: {
        headers: { 
          'Prefer': 'return=minimal',
          'Accept': '*/*'
        },
      },
    });
  }

  return supabaseInstance;
};

// Export the initialized instance
export const supabase = initSupabase();

// Test connection function with better error handling
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('count')
      .limit(1)
      .single();

    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Supabase connection test error:', err);
    return false;
  }
};

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};