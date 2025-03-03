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
        // Busca direta pelo ID usando o cliente Supabase original
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (error) {
          console.error('Erro Supabase:', error);
          setError(error.message);
          return;
        }

        if (!data) {
          setError('Jogo não encontrado');
          return;
        }

        console.log('Jogo encontrado:', data);
        setGame(data);
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
      <div>
        <h1>Erro</h1>
        <p>{error}</p>
        <pre>Game ID: {gameId}</pre>
      </div>
    );
  }

  if (!game) {
    return <div>Jogo não encontrado</div>;
  }

  return (
    <div>
      <h1>Teste de Confirmação</h1>
      <div>
        <h2>Dados do Jogo:</h2>
        <pre>{JSON.stringify(game, null, 2)}</pre>
      </div>
    </div>
  );
}
