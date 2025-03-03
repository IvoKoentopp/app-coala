import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InvitationSettings {
  invitation_image?: string | null;
  invitation_url?: string | null;
  club_invitation?: string | null;
}

export default function Invitation() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<InvitationSettings>({});
  const [connectionError, setConnectionError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadInvitationSettings();
  }, []);

  const loadInvitationSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('settings')
        .select('invitation_image, invitation_url, club_invitation')
        .single();

      if (error) {
        console.error('Erro ao carregar configurações:', error);
        setError('Erro ao carregar configurações. Tente novamente.');
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

  const handleCopyClick = async () => {
    if (settings.club_invitation) {
      try {
        await navigator.clipboard.writeText(settings.club_invitation);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Erro ao copiar texto:', err);
      }
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
              onClick={loadInvitationSettings}
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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Convite do Clube</h1>

          {settings.invitation_image && (
            <div className="mb-6">
              <img
                src={settings.invitation_image}
                alt="Convite"
                className="w-full rounded-lg shadow-lg"
              />
              {settings.invitation_url && (
                <div className="mt-4 flex justify-end">
                  <a
                    href={settings.invitation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    Ver em tamanho original
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                </div>
              )}
            </div>
          )}

          {settings.club_invitation && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Texto do Convite
              </h2>
              <div className="relative">
                <div className="bg-gray-50 p-4 rounded-lg text-gray-700 whitespace-pre-wrap">
                  {settings.club_invitation}
                </div>
                <button
                  onClick={handleCopyClick}
                  className={`absolute top-2 right-2 p-2 rounded-full ${
                    copied
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Copiar texto"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {!settings.invitation_image && !settings.club_invitation && (
            <div className="text-center text-gray-500 py-8">
              Nenhum convite configurado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}