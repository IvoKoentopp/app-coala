import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Logo from '../components/Logo';

interface Game {
  id: string;
  status: string;
  date: string;
  field: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
      // Primeiro vamos ver todos os jogos para debug
      const allGamesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/games?select=id`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );
      
      const allGames = await allGamesResponse.json();
      console.log('Todos os jogos:', allGames);

      // Agora busca o jogo específico
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/games?id=eq.${encodeURIComponent(gameId)}&select=id,status,date,field`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Accept': 'application/json'
          }
        }
      );

      console.log('URL:', `${SUPABASE_URL}/rest/v1/games?id=eq.${encodeURIComponent(gameId)}`);
      console.log('Status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Dados do jogo:', data);

      if (!data || data.length === 0) {
        setError('Jogo não encontrado');
        setLoading(false);
        return;
      }

      setGame(data[0]);
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
            <pre className="mt-4 p-2 bg-gray-100 rounded text-sm overflow-auto">
              {JSON.stringify(game, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}