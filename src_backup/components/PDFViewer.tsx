import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { AlertTriangle } from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFViewerProps {
  url: string;
  height?: number;
}

export default function PDFViewer({ url, height = 600 }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1.5);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  useEffect(() => {
    loadPDF();
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [url]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage();
    }
  }, [currentPage, scale, pdfDoc]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      // Add cache-busting parameter to prevent caching issues
      const pdfUrl = `${url}?t=${Date.now()}`;
      
      const loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        withCredentials: true
      });
      
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Erro ao carregar o PDF. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      setLoading(true);
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
      setError('Erro ao renderizar a página. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-red-50 rounded-lg">
        <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-gray-100 rounded-lg p-4">
      {/* Controls */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="px-3 py-1 bg-white border rounded-md disabled:opacity-50"
          >
            ←
          </button>
          <span className="text-sm">
            Página {currentPage} de {numPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="px-3 py-1 bg-white border rounded-md disabled:opacity-50"
          >
            →
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="px-3 py-1 bg-white border rounded-md"
          >
            -
          </button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="px-3 py-1 bg-white border rounded-md"
          >
            +
          </button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div 
        className="relative overflow-auto bg-white rounded-lg shadow"
        style={{ height: `${height}px`, maxWidth: '100%' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
          </div>
        )}
        <canvas ref={canvasRef} className="mx-auto" />
      </div>
    </div>
  );
}