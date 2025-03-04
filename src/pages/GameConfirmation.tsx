import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabaseAnon } from '../lib/supabase-anon';
import Logo from '../components/Logo';
import { PostgrestError } from '@supabase/supabase-js';

interface Game {
  id: string;
  date: string;
  field: string;
  status: string;
  created_at: string;
  updated_at: string;
  cancellation_reason: string | null;
}

interface Member {
  id: string;
  nickname: string;
}

export default function GameConfirmation() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    const loadGame = async () => {
      try {
        if (!gameId) {
          console.error('Game ID não fornecido');
          setError('ID do jogo não fornecido');
          return;
        }

        console.log('Buscando jogo:', gameId);
        const { data, error } = await supabaseAnon
          .from('games')
          .select('id, date, field, status')
          .eq('id', gameId)
          .single();

        if (error) {
          console.error('Erro Supabase:', error);
          if (error.code === 'PGRST116') {
            setError('Jogo não encontrado');
          } else if (error.code === '42501') {
            setError('Sem permissão para ver este jogo');
          } else {
            setError(`Erro ao carregar jogo: ${error.message}`);
          }
          return;
        }

        if (!data) {
          setError('Jogo não encontrado');
          return;
        }

        if (data.status !== 'Agendado') {
          setError('Este jogo não está mais agendado');
          return;
        }

        setGame(data);
      } catch (err) {
        console.error('Erro ao carregar jogo:', err);
        setError('Erro inesperado ao carregar detalhes do jogo');
      }
    };

    loadGame();
  }, [gameId]);

  const handleConfirmation = async (willPlay: boolean) => {
    if (!nickname.trim()) {
      setError('Por favor, informe seu apelido');
      return;
    }

    if (!game) {
      setError('Jogo não encontrado');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: member, error: memberError } = await supabaseAnon
        .from('members')
        .select('id, nickname')
        .eq('nickname', nickname.trim())
        .maybeSingle();

      if (memberError) {
        console.error('Erro ao buscar membro:', memberError);
        throw memberError;
      }
      
      if (!member) {
        setError('Apelido não encontrado. Verifique se digitou corretamente.');
        return;
      }

      console.log('Membro encontrado:', member);

      const { error: confirmError } = await supabaseAnon
        .from('game_participants')
        .upsert({
          game_id: gameId,
          member_id: member.id,
          confirmed: willPlay
        }, {
          onConflict: 'game_id,member_id'
        });

      if (confirmError) {
        console.error('Erro ao confirmar:', confirmError);
        throw confirmError;
      }

      setSuccess(willPlay ? 'Presença confirmada!' : 'Ausência registrada!');

      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err) {
      console.error('Erro:', err);
      const error = err as PostgrestError;
      
      if (error?.code === '42501') {
        setError('Não foi possível confirmar sua presença. O jogo pode não estar mais disponível para confirmação.');
      } else if (error?.message) {
        setError(`Erro ao processar sua confirmação: ${error.message}`);
      } else {
        setError('Erro ao processar sua confirmação. Por favor, tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (error === 'Jogo não encontrado' || error === 'Este jogo não está mais agendado') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <Logo />
        <div className="mt-8 w-full max-w-md bg-white rounded-lg shadow p-6">
          <div className="text-center text-red-600">
            <p className="text-xl font-semibold">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Voltar para Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <Logo />
      
      <div className="mt-8 w-full max-w-md bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-center mb-6">Confirmação de Presença</h2>

        {game && (
          <div className="mb-6 text-center">
            <p className="text-gray-600">
              Data: {new Date(game.date).toLocaleDateString()}
            </p>
            <p className="text-gray-600">
              Local: {game.field}
            </p>
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="mb-4 text-green-600 font-medium">{success}</div>
            <p className="text-gray-600">Obrigado por confirmar!</p>
            <p className="text-sm text-gray-500 mt-2">
              Redirecionando para a página inicial...
            </p>
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
                Seu Apelido
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Digite seu apelido"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
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