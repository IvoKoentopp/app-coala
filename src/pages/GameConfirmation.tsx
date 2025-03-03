import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

interface Game {
  id: string;
  status: string;
}

export default function GameConfirmation() {
  const { gameId } = useParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [nickname, setNickname] = useState('');

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
      console.log('Checking game:', gameId);
      
      const { data: game, error } = await supabase
        .from('games')
        .select('id, status')
        .eq('id', gameId)
        .single();

      console.log('Response:', { game, error });

      if (error) {
        console.error('Error:', error);
        setError('Erro ao carregar o jogo');
        setLoading(false);
        return;
      }

      if (!game) {
        setError('Jogo não encontrado');
        setLoading(false);
        return;
      }

      if (game.id !== gameId) {
        setError('ID do jogo inválido');
        setLoading(false);
        return;
      }

      if (game.status !== 'Agendado') {
        setError('Este jogo não está agendado');
        setLoading(false);
        return;
      }

      setGame(game);
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setError('Erro ao carregar o jogo');
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!game) return;
    
    if (!nickname.trim()) {
      setError('Digite seu apelido');
      return;
    }

    try {
      // Primeiro busca o membro pelo apelido
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('nickname', nickname.trim())
        .eq('status', 'Ativo')
        .maybeSingle();

      if (memberError) {
        console.error('Member error:', memberError);
        setError('Erro ao buscar membro');
        return;
      }

      if (!member) {
        setError('Membro não encontrado ou inativo');
        return;
      }

      // Atualiza a participação
      const { error: updateError } = await supabase
        .from('game_participants')
        .update({ confirmed: true })
        .eq('game_id', game.id)
        .eq('member_id', member.id);

      if (updateError) {
        console.error('Update error:', updateError);
        setError('Erro ao confirmar presença');
        return;
      }

      setError('');
      alert('Presença confirmada com sucesso!');
    } catch (err) {
      console.error('Error:', err);
      setError('Erro ao confirmar presença');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Logo />
      
      {error ? (
        <div className="mt-4 text-red-600">{error}</div>
      ) : (
        <div className="mt-8 w-full max-w-md">
          <input
            type="text"
            placeholder="Digite seu apelido"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <button
            onClick={handleConfirm}
            className="w-full mt-4 p-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Confirmar Presença
          </button>
        </div>
      )}
    </div>
  );
}