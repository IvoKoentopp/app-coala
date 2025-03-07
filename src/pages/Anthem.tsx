import React, { useState, useEffect } from 'react';
import { Music, ExternalLink, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import Logo from '../components/Logo';
import html2pdf from 'html2pdf.js';
import { supabase } from '../lib/supabase';

interface AnthemSettings {
  club_anthem_url?: string | null;
  club_anthem_lyrics?: string | null;
}

export default function Anthem() {
  const [settings, setSettings] = useState<AnthemSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAnthemSettings();
  }, []);

  const fetchAnthemSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('club_settings')
        .select('key, value')
        .in('key', ['club_anthem_url', 'club_anthem_lyrics']);

      if (error) throw error;

      const settingsMap = data?.reduce((acc: AnthemSettings, item) => {
        acc[item.key as keyof AnthemSettings] = item.value;
        return acc;
      }, {});

      setSettings(settingsMap || {});
    } catch (err) {
      console.error('Error fetching anthem settings:', err);
      setError('Erro ao carregar o hino. Por favor, tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchAnthemSettings();
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    try {
      const element = contentRef.current;
      const opt = {
        margin: 1,
        filename: 'hino.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Erro ao gerar PDF. Por favor, tente novamente.');
    }
  };

  if (loading) {
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
          <Logo />
          <div className="flex flex-col items-center justify-center text-yellow-600 mt-8">
            <AlertTriangle className="w-12 h-12 mb-4" />
            <p className="text-center text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!settings.club_anthem_url && !settings.club_anthem_lyrics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Logo />
          <div className="flex flex-col items-center justify-center text-gray-600 mt-8">
            <Music className="w-12 h-12 mb-4" />
            <p className="text-center">
              O hino ainda não foi configurado. Entre em contato com um administrador.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <Logo />
        
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Music className="w-6 h-6 mr-2" />
              Hino do Clube
            </h1>
            <div className="flex space-x-2 no-print">
              {settings.club_anthem_url && (
                <a
                  href={settings.club_anthem_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ouvir Hino
                </a>
              )}
              {settings.club_anthem_lyrics && (
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </button>
              )}
            </div>
          </div>

          {settings.club_anthem_lyrics && (
            <div 
              ref={contentRef}
              className="prose max-w-none anthem-content"
            >
              <h1 className="text-2xl font-bold text-center mb-6">Hino do Clube</h1>
              <div 
                className="text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: settings.club_anthem_lyrics }}
              />
            </div>
          )}

          {settings.club_anthem_url && (
            <div className="mt-8 p-4 bg-green-50 rounded-lg no-print">
              <h3 className="font-semibold text-green-800 mb-2">Como ouvir o hino?</h3>
              <ol className="list-decimal list-inside text-green-700 space-y-2">
                <li>Clique no botão "Ouvir Hino" acima</li>
                <li>O hino será aberto em uma nova aba do navegador</li>
                <li>Você poderá ouvir o hino diretamente do serviço de streaming</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}