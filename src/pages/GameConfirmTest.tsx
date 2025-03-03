import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

interface Game {
  id: string;
  status: string;
  date: string;
  field: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function GameConfirmTest() {
  const { gameId } = useParams();
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [allGames, setAllGames] = useState<Game[]>([]);

  useEffect(() => {
    if (!gameId) return;

    const fetchGames = async () => {
      try {
        // Primeiro lista todos os jogos
        const gamesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/games?select=*`,
          {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Accept-Profile': 'public',
              'Accept-Encoding': 'gzip',
              'X-Client-Info': 'supabase-js/2.39.3'
            }
          }
        );

        console.log('Status da resposta:', gamesResponse.status);
        console.log('Headers da resposta:', Object.fromEntries(gamesResponse.headers.entries()));
        
        const games = await gamesResponse.json();
        console.log('Todos os jogos:', games);
        console.log('ID procurado:', gameId);

        if (!games || !Array.isArray(games)) {
          console.log('Resposta inválida:', games);
          setError('Resposta inválida do servidor');
          return;
        }

        setAllGames(games);

        // Agora busca o jogo específico
        const gameResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/games?id=eq.${encodeURIComponent(gameId)}&select=*`,
          {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Accept-Profile': 'public',
              'Accept-Encoding': 'gzip',
              'X-Client-Info': 'supabase-js/2.39.3'
            }
          }
        );

        console.log('Status da resposta do jogo:', gameResponse.status);
        console.log('Headers da resposta do jogo:', Object.fromEntries(gameResponse.headers.entries()));
        
        const gameData = await gameResponse.json();
        console.log('Dados do jogo:', gameData);

        if (!gameData || !Array.isArray(gameData) || gameData.length === 0) {
          setError('Jogo específico não encontrado');
          return;
        }

        setGame(gameData[0]);
      } catch (err) {
        console.error('Erro:', err);
        setError('Erro ao buscar jogos');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [gameId]);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>Teste de Confirmação</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Configuração:</h2>
        <div><strong>URL:</strong> {SUPABASE_URL}</div>
        <div><strong>Game ID:</strong> {gameId}</div>
      </div>

      {error ? (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: 'red' }}>Erro</h2>
          <p>{error}</p>
        </div>
      ) : game ? (
        <div>
          <h2>Jogo Encontrado:</h2>
          <div style={{ marginBottom: '20px' }}>
            <p><strong>ID:</strong> {game.id}</p>
            <p><strong>Status:</strong> {game.status}</p>
            <p><strong>Data:</strong> {new Date(game.date).toLocaleDateString()}</p>
            <p><strong>Campo:</strong> {game.field}</p>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: '40px' }}>
        <h2>Todos os Jogos na Tabela ({allGames.length}):</h2>
        <div style={{ 
          maxHeight: '400px', 
          overflow: 'auto',
          background: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px'
        }}>
          <pre>
            {JSON.stringify(allGames, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
