import React, { useState, useEffect } from 'react';
import { Download, Printer, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase, testConnection } from '../lib/supabase';
import html2pdf from 'html-to-pdf-js';

interface StatuteSetting {
  value: string | null;
}

export default function Statute() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statuteContent, setStatuteContent] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

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
      fetchStatute();
    }
  };

  const fetchStatute = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('club_settings')
        .select('value')
        .eq('key', 'club_statute')
        .single();

      if (error) throw error;

      if (data?.value) {
        setStatuteContent(data.value);
      } else {
        setError('O estatuto ainda não foi configurado. Entre em contato com um administrador.');
      }
    } catch (err) {
      console.error('Error fetching statute:', err);
      setError('Erro ao carregar o estatuto. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    checkConnection();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    try {
      const element = contentRef.current;
      const opt = {
        margin: 1,
        filename: 'estatuto.pdf',
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Estatuto do Clube</h1>
          {statuteContent && (
            <div className="flex space-x-2">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </button>
            </div>
          )}
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center text-yellow-600 p-8">
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
        ) : (
          <div 
            ref={contentRef}
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: statuteContent || '' }}
          />
        )}
      </div>
    </div>
  );
}