import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

export default function GameConfirmation() {
  const { gameId } = useParams();
  const [memberId, setMemberId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('id, nickname')
          .order('nickname');

        if (error) {
          console.error('Erro ao carregar membros:', error);
          return;
        }

        setMembers(data || []);
      } catch (err) {
        console.error('Erro ao carregar membros:', err);
      }
    };

    loadMembers();
  }, []);

  const handleConfirmation = async (willPlay: boolean) => {
    if (!memberId) {
      setError('Por favor, selecione seu nome');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Verifica se o jogo existe e está agendado
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('status')
        .eq('id', gameId)
        .maybeSingle();

      if (gameError || !game) {
        setError('Jogo não encontrado');
        return;
      }

      if (game.status !== 'Agendado') {
        setError('Este jogo não está mais agendado');
        return;
      }

      // 2. Atualiza ou cria a confirmação
      const { error: confirmError } = await supabase
        .from('game_participants')
        .upsert({
          game_id: gameId,
          member_id: memberId,
          confirmed: willPlay
        });

      if (confirmError) {
        throw confirmError;
      }

      setSuccess(willPlay ? 'Presença confirmada!' : 'Ausência registrada!');
    } catch (err) {
      console.error('Erro:', err);
      setError('Erro ao processar sua confirmação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <Logo />
      
      <div className="mt-8 w-full max-w-md bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-center mb-6">Confirmação de Presença</h2>

        {success ? (
          <div className="text-center">
            <div className="mb-4 text-green-600 font-medium">{success}</div>
            <p className="text-gray-600">Obrigado por confirmar!</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Selecione seu Nome
              </label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Selecione...</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.nickname}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => handleConfirmation(true)}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Vou Jogar'}
              </button>
              
              <button
                onClick={() => handleConfirmation(false)}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Não Vou Jogar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}