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
        // Primeiro lista todos os jogos
        const { data: games, error: gamesError } = await supabase
          .from('games')
          .select('*');

        console.log('Todos os jogos:', games);
        console.log('ID procurado:', gameId);

        if (gamesError) {
          console.error('Erro ao listar jogos:', gamesError);
          setError(gamesError.message);
          return;
        }

        if (!games || games.length === 0) {
          console.log('Nenhum jogo encontrado na tabela');
          setError('Nenhum jogo encontrado na tabela');
          return;
        }

        setAllGames(games);

        // Procura o jogo específico
        const foundGame = games.find(g => g.id === gameId);
        console.log('Jogo encontrado:', foundGame);

        if (!foundGame) {
          setError('Jogo específico não encontrado');
          return;
        }

        setGame(foundGame);
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
      
      {error ? (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: 'red' }}>Erro</h2>
          <p>{error}</p>
          <div><strong>Game ID procurado:</strong> {gameId}</div>
          <div><strong>URL do Supabase:</strong> {supabase.supabaseUrl}</div>
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
