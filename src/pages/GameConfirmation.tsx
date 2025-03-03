import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

interface Game {
  id: string;
  status: string;
  date: string;
  field: string;
}

export default function GameConfirmation() {
  const { gameId } = useParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    checkGame();
  }, [gameId]);

  const checkGame = async () => {
    if (!gameId) {
      setError('Link inválido');
      setLoading(false);
      return;
    }

    try {
      console.log('Buscando jogo:', gameId);
      
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .maybeSingle();

      console.log('Resposta:', { data, error });

      if (error) {
        console.error('Erro ao buscar jogo:', error);
        setError('Erro ao carregar o jogo');
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Jogo não encontrado');
        setLoading(false);
        return;
      }

      setGame(data);
      setLoading(false);
    } catch (err) {
      console.error('Erro:', err);
      setError('Erro ao carregar o jogo');
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Logo />
      
      {error ? (
        <div className="mt-4 text-red-600">{error}</div>
      ) : game ? (
        <div className="mt-8 w-full max-w-md">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold mb-2">Confirmação de Presença</h2>
            <p className="text-gray-600">Data: {new Date(game.date).toLocaleDateString()}</p>
            <p className="text-gray-600">Local: {game.field}</p>
            <p className="text-gray-600">Status: {game.status}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}