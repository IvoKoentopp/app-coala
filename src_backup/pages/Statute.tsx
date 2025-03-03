import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StatuteSettings {
  statute_url?: string | null;
  statute_pdf?: string | null;
}

export default function Statute() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<StatuteSettings>({});

  useEffect(() => {
    loadStatute();
  }, []);

  const loadStatute = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('settings')
        .select('statute_url, statute_pdf')
        .single();

      if (error) {
        console.error('Erro ao carregar estatuto:', error);
        setError('Erro ao carregar estatuto. Tente novamente.');
        return;
      }

      setSettings(data || {});
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center text-red-600 mb-4">
            <AlertTriangle className="h-12 w-12" />
          </div>
          <p className="text-center text-red-600">{error}</p>
          <div className="flex justify-center mt-4">
            <button
              onClick={loadStatute}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Estatuto do Clube</h1>

          <div className="space-y-6">
            {settings.statute_url && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  Visualizar Online
                </h2>
                <a
                  href={settings.statute_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  Abrir no navegador
                  <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </div>
            )}

            {settings.statute_pdf && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  Download do PDF
                </h2>
                <a
                  href={settings.statute_pdf}
                  download
                  className="inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  Baixar PDF
                  <Download className="w-4 h-4 ml-1" />
                </a>
              </div>
            )}

            {!settings.statute_url && !settings.statute_pdf && (
              <div className="text-center text-gray-500 py-8">
                Nenhum estatuto configurado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}