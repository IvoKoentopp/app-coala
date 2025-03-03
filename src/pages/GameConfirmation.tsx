import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import Logo from '../components/Logo';
import { Check, X, AlertTriangle, Search } from 'lucide-react';

interface Game {
  id: string;
  date: string;
  field: string;
  status: string;
}

export default function GameConfirmation() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [members, setMembers] = useState<{id: string, nickname: string}[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<{id: string, nickname: string}[]>([]);
  const [showMembersList, setShowMembersList] = useState(false);

  useEffect(() => {
    fetchGame();
    fetchMembers();
  }, [gameId]);

  useEffect(() => {
    if (nickname.trim().length > 0) {
      const filtered = members.filter(member => 
        member.nickname.toLowerCase().includes(nickname.toLowerCase())
      );
      setFilteredMembers(filtered);
      setShowMembersList(filtered.length > 0);
    } else {
      setFilteredMembers([]);
      setShowMembersList(false);
    }
  }, [nickname, members]);

  const fetchGame = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!gameId) {
        setError('Link inválido');
        return;
      }

      // Primeiro, busca apenas o jogo
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          id,
          date,
          field,
          status
        `)
        .eq('id', gameId)
        .maybeSingle();

      if (gameError) {
        console.error('Error fetching game:', gameError);
        setError('Erro ao carregar os dados do jogo');
        return;
      }
      
      if (!gameData) {
        setError('Jogo não encontrado');
        return;
      }

      if (gameData.status !== 'Agendado') {
        setError(`Este jogo está ${gameData.status.toLowerCase()}. Não é possível confirmar presença.`);
        return;
      }

      setGame(gameData);
    } catch (err) {
      console.error('Error fetching game:', err);
      setError('Erro ao carregar os dados do jogo');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, nickname')
        .eq('status', 'Ativo')
        .order('nickname');
        
      if (error) throw error;
      
      if (data) {
        setMembers(data);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const handleSelectMember = (memberId: string, memberNickname: string) => {
    setNickname(memberNickname);
    setShowMembersList(false);
  };

  const handleConfirmation = async (isConfirmed: boolean) => {
    try {
      setIsSubmitting(true);
      setError('');
      
      if (!gameId || !nickname.trim()) {
        setError('Por favor, informe seu apelido');
        return;
      }

      // Buscar o membro pelo apelido
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('nickname', nickname.trim())
        .single();

      if (memberError) {
        if (memberError.code === 'PGRST116') {
          setError(`Sócio com apelido "${nickname}" não encontrado. Verifique se digitou corretamente.`);
        } else {
          throw memberError;
        }
        return;
      }

      const memberId = memberData.id;

      // Verificar se já existe uma participação para este jogo e membro
      const { data: existingParticipation, error: participationError } = await supabase
        .from('game_participants')
        .select('id')
        .eq('game_id', gameId)
        .eq('member_id', memberId)
        .maybeSingle();

      if (participationError) throw participationError;

      if (existingParticipation) {
        // Atualizar participação existente
        const { error: updateError } = await supabase
          .from('game_participants')
          .update({
            confirmed: isConfirmed,
            confirmation_date: new Date().toISOString()
          })
          .eq('game_id', gameId)
          .eq('member_id', memberId);

        if (updateError) throw updateError;
      } else {
        // Criar nova participação
        const { error: insertError } = await supabase
          .from('game_participants')
          .insert({
            game_id: gameId,
            member_id: memberId,
            confirmed: isConfirmed,
            confirmation_date: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      setSuccess(isConfirmed ? 'Presença confirmada com sucesso!' : 'Ausência registrada com sucesso!');
    } catch (err) {
      console.error('Error updating confirmation:', err);
      setError('Erro ao confirmar presença. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
          <div className="mt-4 text-gray-600">Carregando...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Logo />
          <div className="mt-6 flex flex-col items-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Voltar para a página inicial
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
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
              Confirme sua presença para o jogo do dia{' '}
              <span className="font-medium">
                {format(new Date(game.date), 'dd/MM/yyyy')}
              </span>
            </p>
            <p className="text-sm text-gray-500">{game.field}</p>
          </div>

          {success ? (
            <div className="mt-8 p-4 bg-green-50 text-green-700 rounded-md">
              {success}
              <div className="mt-4 text-sm text-gray-600">
                Você pode fechar esta janela.
              </div>
            </div>
          ) : (
            <>
              <div className="mt-8 mb-6">
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                  Digite seu apelido
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Seu apelido no clube"
                    autoComplete="off"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  
                  {/* Lista de membros filtrados */}
                  {showMembersList && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                      {filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => handleSelectMember(member.id, member.nickname)}
                          className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-green-50 text-left"
                        >
                          {member.nickname}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => handleConfirmation(true)}
                  disabled={isSubmitting || !nickname.trim()}
                  className={`flex items-center px-6 py-2 rounded-md text-sm font-medium ${
                    isSubmitting || !nickname.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Vou Jogar
                </button>
                <button
                  onClick={() => handleConfirmation(false)}
                  disabled={isSubmitting || !nickname.trim()}
                  className={`flex items-center px-6 py-2 rounded-md text-sm font-medium ${
                    isSubmitting || !nickname.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  <X className="w-4 h-4 mr-2" />
                  Não Vou Jogar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}