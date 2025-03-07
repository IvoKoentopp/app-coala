import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set loading to true when starting to fetch session
    setLoading(true);
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(error => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthError = (error: AuthError) => {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Email ou senha incorretos');
    } else if (error.message.includes('Email not confirmed')) {
      throw new Error('Por favor, confirme seu email antes de fazer login');
    } else if (error.message.includes('refresh_token_not_found')) {
      // Handle silently - will redirect to login
      return;
    } else {
      throw new Error('Erro ao autenticar. Por favor, tente novamente.');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });

      if (error) {
        handleAuthError(error);
      }

      if (data.session) {
        setSession(data.session);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao fazer login. Por favor, tente novamente.');
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email: email.trim(), 
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          throw new Error('Este email já está cadastrado. Por favor, faça login.');
        }
        throw error;
      }

      if (data.session) {
        setSession(data.session);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao criar conta. Por favor, tente novamente.');
    }
  };

  const signOut = async () => {
    try {
      // First clear the session state
      setSession(null);
      
      // Then attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      // If there's an error but it's just about missing session, we can ignore it
      // since we've already cleared the local session
      if (error && !error.message.includes('Auth session missing')) {
        throw error;
      }
    } catch (error) {
      // Only log the error but don't throw it, as we want the sign out to succeed
      // even if the server-side session clearing fails
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};