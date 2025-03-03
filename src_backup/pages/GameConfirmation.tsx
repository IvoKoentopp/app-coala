import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, findMemberByNickname } from '../lib/supabase';
import { AlertTriangle, Check, X } from 'lucide-react';
import Logo from '../components/Logo';

interface Game {
  id: string;
  date: string;
  time: string;
  location: string;
  status: string;
}

interface Member {
  id: string;
  nickname: string;
}

export default function GameConfirmation() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmationSuccess, setConfirmationSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('GameConfirmation: Iniciando carregamento do jogo');
    console.log('GameId recebido:', gameId);
    loadGame();
  }, [gameId]);

  const loadGame = async () => {
    try {
      console.log('LoadGame: Iniciando busca do jogo');
      if (!gameId) {
        console.log('LoadGame: gameId não fornecido');
        setError('ID do jogo não fornecido');
        setLoading(false);
        return;
      }

      console.log('LoadGame: Fazendo requisição ao Supabase para o jogo:', gameId);
      const { data: game, error } = await supabase
        .from('games')
        .select('id, date, location, status')
        .eq('id', gameId)
        .single()
        .headers({
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        });

      console.log('LoadGame: Resposta do Supabase:', { game, error });

      if (error) {
        throw error;
      }

      if (!game) {
        setError('Jogo não encontrado');
        setLoading(false);
        return;
      }

      if (game.status !== 'agendado') {
        setError('Este jogo não está mais disponível para confirmação');
        setLoading(false);
        return;
      }

      setGame(game);
    } catch (err) {
      console.error('Erro ao carregar jogo:', err);
      setError('Erro ao carregar informações do jogo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nickname.trim()) {
      setError('Por favor, informe seu apelido');
      return;
    }

    try {
      setLoading(true);

      // Busca o membro pelo apelido
      const { data: member, error: memberError } = await findMemberByNickname(nickname);

      if (memberError) {
        throw memberError;
      }

      if (!member) {
        setError('Membro não encontrado com este apelido');
        return;
      }

      // Verifica se já existe confirmação
      const { data: existingConfirmation, error: confirmationError } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_id', gameId)
        .eq('member_id', member.id)
        .single();

      if (confirmationError && confirmationError.code !== 'PGRST116') {
        throw confirmationError;
      }

      if (existingConfirmation) {
        setError('Você já confirmou presença neste jogo');
        return;
      }

      const handleConfirmation = async (isConfirmed: boolean) => {
        try {
          // Log do dispositivo e navegador
          const userAgent = window.navigator.userAgent;
          const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
          
          // Envia logs para o console e para o webhook
          const logData = {
            event: 'game_confirmation_attempt',
            userAgent,
            isMobile,
            gameId,
            nickname: nickname.trim(),
            timestamp: new Date().toISOString()
          };
          
          console.log('Debug Info:', logData);
          
          // Envia logs para um webhook que você pode acessar depois
          fetch('https://webhook.site/e7f3f8b0-9f9a-4b8a-8f9a-9f9a4b8a8f9a', {
            method: 'POST',
            body: JSON.stringify(logData),
            headers: {
              'Content-Type': 'application/json'
            }
          }).catch(console.error); // Não espera a resposta para não atrasar o fluxo

          setLoading(true);
          setError('');

          // Confirma participação
          const { error: participationError } = await supabase
            .from('game_participants')
            .insert([
              {
                game_id: gameId,
                member_id: member.id,
                status: 'confirmado'
              }
            ]);

          if (participationError) {
            throw participationError;
          }

          setConfirmationSuccess(true);
          setTimeout(() => {
            navigate('/games');
          }, 2000);

        } catch (err) {
          console.error('Erro ao confirmar participação:', err);
          setError('Erro ao confirmar participação. Tente novamente.');
        } finally {
          setLoading(false);
        }
      };

      handleConfirmation(true);

    } catch (err) {
      console.error('Erro ao confirmar participação:', err);
      setError('Erro ao confirmar participação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="flex justify-center mb-8">
          <Logo className="w-24 h-24" />
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (confirmationSuccess) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center mb-8">
            <Logo className="w-24 h-24" />
          </div>
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-lg font-medium text-gray-900 text-center">
                Presença confirmada com sucesso!
              </h2>
              <p className="mt-2 text-sm text-gray-500 text-center">
                Redirecionando para a lista de jogos...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-8">
          <Logo className="w-24 h-24" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Confirmar Presença
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error ? (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          ) : game ? (
            <div className="mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Detalhes do Jogo
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Data: {new Date(game.date).toLocaleDateString()}</p>
                <p>Horário: {game.time}</p>
                <p>Local: {game.location}</p>
              </div>
            </div>
          ) : null}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
                Seu apelido
              </label>
              <div className="mt-1">
                <input
                  id="nickname"
                  name="nickname"
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Digite seu apelido"
                />
              </div>
            </div>

            <div className="flex items-center justify-between space-x-3">
              <button
                type="button"
                onClick={() => navigate('/games')}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}