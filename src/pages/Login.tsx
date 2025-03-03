import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AlertTriangle } from 'lucide-react';

interface MissingFields {
  photo_url?: boolean;
  phone?: boolean;
  birth_date?: boolean;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [missingFields, setMissingFields] = useState<MissingFields | null>(null);
  const [configError, setConfigError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if Supabase is properly configured
    if (!isSupabaseConfigured()) {
      setConfigError(true);
      setError('O sistema não está configurado corretamente. Entre em contato com o administrador.');
    }
  }, []);

  const checkMissingFields = async (userId: string) => {
    try {
      const { data: member, error } = await supabase
        .from('members')
        .select('photo_url, phone, birth_date')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (member) {
        const missing: MissingFields = {};
        if (!member.photo_url) missing.photo_url = true;
        if (!member.phone) missing.phone = true;
        if (!member.birth_date) missing.birth_date = true;

        if (Object.keys(missing).length > 0) {
          setMissingFields(missing);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Erro ao verificar campos:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (configError) {
      return;
    }

    setError('');
    setMissingFields(null);
    setIsLoading(true);

    try {
      await signIn(email.trim(), password);
      
      // Get current session after sign in
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const hasMissingFields = await checkMissingFields(session.user.id);
        
        if (!hasMissingFields) {
          navigate('/');
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else {
          setError(error.message);
        }
      } else {
        setError('Ocorreu um erro ao fazer login. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteProfile = () => {
    navigate('/members/edit/me');
  };

  const handleContinue = () => {
    navigate('/');
  };

  return (
    <div className="fixed inset-0 bg-green-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-xl shadow-lg">
          <Logo />
          
          {configError ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex flex-col items-center mt-6">
              <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
              <p className="text-center text-yellow-700">{error}</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-6">
                  <p className="text-center">{error}</p>
                </div>
              )}

              {missingFields && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                  <h3 className="text-lg font-medium text-yellow-800 mb-2">
                    Complete seu cadastro
                  </h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    Alguns campos importantes estão faltando no seu cadastro:
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 mb-4">
                    {missingFields.photo_url && <li>Foto do perfil</li>}
                    {missingFields.phone && <li>Telefone para contato</li>}
                    {missingFields.birth_date && <li>Data de nascimento</li>}
                  </ul>
                  <div className="space-y-2">
                    <button
                      onClick={handleCompleteProfile}
                      className="w-full bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md hover:bg-yellow-200 transition-colors"
                    >
                      Completar cadastro agora
                    </button>
                    <button
                      onClick={handleContinue}
                      className="w-full bg-white text-gray-600 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      Continuar sem completar
                    </button>
                  </div>
                </div>
              )}

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-base"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading || authLoading}
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Senha
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-base"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading || authLoading}
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading || authLoading}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
                      isLoading || authLoading
                        ? 'bg-green-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                  >
                    {isLoading || authLoading ? 'Entrando...' : 'Entrar'}
                  </button>
                </div>
              </form>

              <p className="mt-4 text-center text-sm text-gray-600">
                Não tem uma conta?{' '}
                <Link to="/register" className="font-medium text-green-600 hover:text-green-500">
                  Registre-se
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}