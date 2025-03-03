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
      // Primeiro testa a conexão
      const isConnected = await testConnection();
      if (!isConnected) {
        setError('Erro de conexão com o servidor');
        setLoading(false);
        return;
      }

      // Busca o jogo
      const { data, error } = await supabase
        .from('games')
        .select('id, status, date, field')
        .eq('id', gameId)
        .single();

      if (error) {
        console.error('Error fetching game:', error);
        setError('Erro ao carregar o jogo');
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Jogo não encontrado');
        setLoading(false);
        return;
      }

      if (data.status !== 'Agendado') {
        setError('Este jogo não está agendado');
        setLoading(false);
        return;
      }

      setGame(data);
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
        .single();

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
      ) : game ? (
        <div className="mt-8 w-full max-w-md">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold mb-2">Confirmação de Presença</h2>
            <p className="text-gray-600">Data: {new Date(game.date).toLocaleDateString()}</p>
            <p className="text-gray-600">Local: {game.field}</p>
          </div>
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
      ) : null}
    </div>
  );
}