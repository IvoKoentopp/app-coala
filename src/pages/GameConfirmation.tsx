import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

export default function GameConfirmation() {
  const { gameId } = useParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
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
      const { data, error } = await supabase
        .from('games')
        .select('status')
        .eq('id', gameId)
        .single();

      if (error || !data) {
        setError('Jogo não encontrado');
        setLoading(false);
        return;
      }

      if (data.status !== 'Agendado') {
        setError('Este jogo não está agendado');
        setLoading(false);
        return;
      }

      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar o jogo');
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!nickname.trim()) {
      setError('Digite seu apelido');
      return;
    }

    try {
      const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('nickname', nickname)
        .eq('status', 'Ativo')
        .single();

      if (!member) {
        setError('Membro não encontrado');
        return;
      }

      await supabase
        .from('game_participants')
        .update({ confirmed: true })
        .eq('game_id', gameId)
        .eq('member_id', member.id);

      setError('');
      alert('Presença confirmada com sucesso!');
    } catch (err) {
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