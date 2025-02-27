import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { supabase, testConnection } from '../lib/supabase';

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
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const isConnected = await testConnection();
    if (!isConnected) {
      setConnectionError(true);
      setError('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
      setIsLoading(false);
    } else {
      setConnectionError(false);
      fetchInvitationSettings();
    }
  };

  const fetchInvitationSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('club_settings')
        .select('key, value')
        .in('key', ['invitation_image', 'invitation_url', 'club_invitation']);

      if (error) throw error;

      const settingsMap = data?.reduce((acc: InvitationSettings, item) => {
        acc[item.key as keyof InvitationSettings] = item.value;
        return acc;
      }, {});

      setSettings(settingsMap);
    } catch (err) {
      console.error('Error fetching invitation settings:', err);
      setError('Erro ao carregar as configurações do convite.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    checkConnection();
  };

  const handleDownload = () => {
    if (settings.club_invitation) {
      window.open(settings.club_invitation, '_blank');
    }
  };

  const handleCopyUrl = async () => {
    if (settings.invitation_url) {
      try {
        await navigator.clipboard.writeText(settings.invitation_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Error copying to clipboard:', err);
        setError('Erro ao copiar URL');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
          <div className="mt-4 text-gray-600">Carregando...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col items-center justify-center text-yellow-600">
            <AlertTriangle className="w-12 h-12 mb-4" />
            <p className="text-center text-gray-600 mb-4">{error}</p>
            {connectionError && (
              <button
                onClick={handleRetry}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Convite</h1>

        {/* Invitation Image */}
        {settings.invitation_image && (
          <div className="mb-8">
            <img
              src={settings.invitation_image}
              alt="Convite"
              className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          {settings.club_invitation && (
            <>
              <button
                onClick={handleDownload}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </button>
              <a
                href={settings.club_invitation}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir em Nova Aba
              </a>
            </>
          )}
          {settings.invitation_url && (
            <button
              onClick={handleCopyUrl}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  URL Copiada!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Link
                </>
              )}
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Como usar o convite?</h3>
          <ol className="list-decimal list-inside text-green-700 space-y-2">
            <li>Visualize o convite acima para conferir o conteúdo</li>
            <li>Você pode baixar o PDF do convite ou abrir em uma nova aba</li>
            <li>Para compartilhar o convite online, use o botão "Copiar Link"</li>
            <li>Compartilhe o link com amigos que você gostaria de convidar para o clube</li>
            <li>Peça para que entrem em contato com você para mais informações sobre o processo de associação</li>
          </ol>
        </div>
      </div>
    </div>
  );
}