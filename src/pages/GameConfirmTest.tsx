import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Game {
  id: string;
  status: string;
  date: string;
  field: string;
}

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
        // Busca todos os jogos usando o mesmo código do Games.tsx
        const { data: gamesData, error: gamesError } = await supabase
          .from('games')
          .select('*')
          .order('date', { ascending: false });

        console.log('Resposta do Supabase:', { gamesData, gamesError });

        if (gamesError) {
          console.error('Erro ao buscar jogos:', gamesError);
          setError(gamesError.message);
          return;
        }

        if (!gamesData) {
          console.log('Nenhum jogo encontrado');
          setError('Nenhum jogo encontrado');
          return;
        }

        setAllGames(gamesData);

        // Busca o jogo específico
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .maybeSingle();

        console.log('Resposta do jogo específico:', { gameData, gameError });

        if (gameError) {
          console.error('Erro ao buscar jogo específico:', gameError);
          setError(gameError.message);
          return;
        }

        if (!gameData) {
          setError('Jogo específico não encontrado');
          return;
        }

        setGame(gameData);
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
        <div><strong>Game ID:</strong> {gameId}</div>
        <div><strong>URL:</strong> {supabase.supabaseUrl}</div>
        <div><strong>Autenticação:</strong> {supabase.supabaseKey ? 'Presente' : 'Ausente'}</div>
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
