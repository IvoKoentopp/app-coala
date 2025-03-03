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

  useEffect(() => {
    if (!gameId) return;

    const fetchGame = async () => {
      try {
        // Primeiro vamos ver o que retorna sem o single()
        const { data: allData, error: firstError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId);

        console.log('Primeira tentativa:', { allData, firstError });

        if (firstError) {
          console.error('Erro na primeira tentativa:', firstError);
          setError(firstError.message);
          return;
        }

        if (!allData || allData.length === 0) {
          console.log('Nenhum jogo encontrado');
          setError('Jogo não encontrado');
          return;
        }

        if (allData.length > 1) {
          console.log('Múltiplos jogos encontrados:', allData);
          setError('Múltiplos jogos encontrados com o mesmo ID');
          return;
        }

        // Se chegou aqui, temos exatamente um jogo
        const game = allData[0];
        console.log('Jogo encontrado:', game);
        setGame(game);
      } catch (err) {
        console.error('Erro:', err);
        setError('Erro ao buscar jogo');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId]);

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ color: 'red', marginBottom: '20px' }}>Erro</h1>
        <p style={{ marginBottom: '10px' }}>{error}</p>
        <div style={{ marginBottom: '20px' }}>
          <strong>Game ID:</strong> {gameId}
        </div>
        <div>
          <strong>URL do Supabase:</strong> {supabase.supabaseUrl}
        </div>
      </div>
    );
  }

  if (!game) {
    return <div>Jogo não encontrado</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>Teste de Confirmação</h1>
      <div>
        <h2 style={{ marginBottom: '10px' }}>Dados do Jogo:</h2>
        <div style={{ marginBottom: '20px' }}>
          <p><strong>ID:</strong> {game.id}</p>
          <p><strong>Status:</strong> {game.status}</p>
          <p><strong>Data:</strong> {new Date(game.date).toLocaleDateString()}</p>
          <p><strong>Campo:</strong> {game.field}</p>
        </div>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px',
          overflow: 'auto'
        }}>
          {JSON.stringify(game, null, 2)}
        </pre>
      </div>
    </div>
  );
}
