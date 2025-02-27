import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import Logo from '../components/Logo';
import { Check, X } from 'lucide-react';

interface Game {
  id: string;
  date: string;
  field: string;
}

interface Member {
  id: string;
  name: string;
  nickname: string;
}

export default function GameConfirmation() {
  const { gameId, memberId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameAndMember();
  }, [gameId, memberId]);

  const fetchGameAndMember = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!gameId || !memberId) {
        setError('Link inválido');
        return;
      }

      // Buscar jogo e membro simultaneamente
      const [gameResponse, memberResponse, participantResponse] = await Promise.all([
        supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single(),
        supabase
          .from('members')
          .select('*')
          .eq('id', memberId)
          .single(),
        supabase
          .from('game_participants')
          .select('confirmed')
          .eq('game_id', gameId)
          .eq('member_id', memberId)
          .single()
      ]);

      if (gameResponse.error || !gameResponse.data) {
        setError('Jogo não encontrado');
        return;
      }

      if (memberResponse.error || !memberResponse.data) {
        setError('Membro não encontrado');
        return;
      }

      setGame(gameResponse.data);
      setMember(memberResponse.data);
      setConfirmed(participantResponse.data?.confirmed ?? null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Erro ao carregar os dados. Por favor, tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmation = async (isConfirmed: boolean) => {
    try {
      if (!gameId || !memberId) return;

      const { error: updateError } = await supabase
        .from('game_participants')
        .update({
          confirmed: isConfirmed,
          confirmation_date: new Date().toISOString()
        })
        .eq('game_id', gameId)
        .eq('member_id', memberId);

      if (updateError) throw updateError;

      setConfirmed(isConfirmed);
      setSuccess(true);
    } catch (err) {
      console.error('Error updating confirmation:', err);
      setError('Erro ao confirmar presença. Por favor, tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Logo />
          <div className="mt-6 text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!game || !member) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Logo />
          <div className="mt-6 text-gray-600">Dados não encontrados</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <Logo />
        
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Confirmação de Presença</h2>
          <div className="mt-4 space-y-2">
            <p className="text-gray-600">
              Olá, <span className="font-medium">{member.nickname}</span>!
            </p>
            <p className="text-gray-600">
              Confirme sua presença para o jogo do dia{' '}
              <span className="font-medium">
                {format(new Date(game.date), 'dd/MM/yyyy')}
              </span>
            </p>
            <p className="text-sm text-gray-500">{game.field}</p>
          </div>

          {success ? (
            <div className="mt-8 p-4 bg-green-50 text-green-700 rounded-md">
              Presença {confirmed ? 'confirmada' : 'recusada'} com sucesso!
              <div className="mt-4 text-sm text-gray-600">
                Você pode fechar esta janela.
              </div>
            </div>
          ) : (
            <div className="mt-8 flex justify-center space-x-4">
              <button
                onClick={() => handleConfirmation(true)}
                className={`flex items-center px-6 py-2 rounded-md text-sm font-medium ${
                  confirmed === true
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-green-50'
                }`}
              >
                <Check className="w-4 h-4 mr-2" />
                Confirmar
              </button>
              <button
                onClick={() => handleConfirmation(false)}
                className={`flex items-center px-6 py-2 rounded-md text-sm font-medium ${
                  confirmed === false
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-red-50'
                }`}
              >
                <X className="w-4 h-4 mr-2" />
                Não Posso
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}