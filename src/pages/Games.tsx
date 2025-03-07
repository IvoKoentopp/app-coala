import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Plus, Calendar, Users, Edit, X, Check, AlertTriangle, Trash2, UserCheck, UserX, UserMinus, Share2, ShieldCheck, MessageCircle } from 'lucide-react';
import { formatDate } from '../lib/date';

interface Member {
  id: string;
  nickname: string;
}

interface Game {
  id: string;
  date: string;
  field: string;
  status: string;
  cancellation_reason: string | null;
  participants: {
    confirmed: number;
    declined: number;
    pending: number;
    total: number;
  };
}

interface GameParticipant {
  member_id: string;
  nickname: string;
  confirmed: boolean | null;
}

// Add deployed site URL constant
const SITE_URL = 'https://gleeful-boba-44f6c3.netlify.app';

export default function Games() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [editedGame, setEditedGame] = useState<Game | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [cancellationReasons, setCancellationReasons] = useState<{ reason: string }[]>([]);
  const [newCancellationReason, setNewCancellationReason] = useState('');
  const [participants, setParticipants] = useState<{
    confirmed: GameParticipant[];
    declined: GameParticipant[];
    pending: GameParticipant[];
  }>({
    confirmed: [],
    declined: [],
    pending: []
  });
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchGames();
    fetchCancellationReasons();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        const { data: member } = await supabase
          .from('members')
          .select('is_admin')
          .eq('user_id', session.user.id)
          .single();
        
        setIsAdmin(member?.is_admin || false);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  const fetchCancellationReasons = async () => {
    try {
      const { data, error } = await supabase
        .from('cancellation_reasons')
        .select('reason')
        .order('reason');

      if (error) throw error;
      if (data) {
        setCancellationReasons(data);
      }
    } catch (err) {
      console.error('Error fetching cancellation reasons:', err);
    }
  };

  const fetchParticipants = async (gameId: string) => {
    try {
      setIsLoadingParticipants(true);
      
      const { data: game } = await supabase
        .from('games')
        .select('status')
        .eq('id', gameId)
        .single();

      // Se o jogo estiver cancelado, retorna listas vazias
      if (game?.status === 'Cancelado') {
        setParticipants({
          confirmed: [],
          declined: [],
          pending: []
        });
        return;
      }

      const { data: participantsData, error } = await supabase
        .from('game_participants')
        .select(`
          member_id,
          members (
            nickname
          ),
          confirmed
        `)
        .eq('game_id', gameId);

      if (error) throw error;

      if (participantsData) {
        const formattedParticipants = participantsData.map(p => ({
          member_id: p.member_id,
          nickname: p.members.nickname,
          confirmed: p.confirmed
        }));

        setParticipants({
          confirmed: formattedParticipants.filter(p => p.confirmed === true),
          declined: formattedParticipants.filter(p => p.confirmed === false),
          pending: formattedParticipants.filter(p => p.confirmed === null)
        });
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
      setError('Erro ao carregar participantes');
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const fetchGames = async () => {
    try {
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .order('date', { ascending: false }); // Changed to descending order

      if (gamesError) throw gamesError;

      if (gamesData) {
        const gamesWithParticipants = await Promise.all(
          gamesData.map(async (game) => {
            // Se o jogo estiver cancelado, retorna contagem zerada
            if (game.status === 'Cancelado') {
              return {
                ...game,
                participants: {
                  confirmed: 0,
                  declined: 0,
                  pending: 0,
                  total: 0
                }
              };
            }

            const { data: participants } = await supabase
              .from('game_participants')
              .select('confirmed')
              .eq('game_id', game.id);

            const confirmed = participants?.filter(p => p.confirmed === true).length || 0;
            const declined = participants?.filter(p => p.confirmed === false).length || 0;
            const pending = participants?.filter(p => p.confirmed === null).length || 0;
            const total = participants?.length || 0;

            return {
              ...game,
              participants: {
                confirmed,
                declined,
                pending,
                total
              }
            };
          })
        );

        setGames(gamesWithParticipants);
      }
    } catch (err) {
      console.error('Error fetching games:', err);
      setError('Erro ao carregar os jogos');
    }
  };

  const handleEdit = (game: Game) => {
    setEditedGame(game);
    setShowEditModal(true);
  };

  const handleShowParticipants = async (game: Game) => {
    setSelectedGame(game);
    await fetchParticipants(game.id);
    setShowParticipantsModal(true);
  };

  const handleDelete = async (gameId: string) => {
    try {
      if (!isAdmin) {
        setError('Apenas administradores podem excluir jogos');
        return;
      }

      if (window.confirm('Tem certeza que deseja excluir este jogo?')) {
        const { error } = await supabase
          .from('games')
          .delete()
          .eq('id', gameId);
        
        if (error) throw error;
        
        setSuccess('Jogo excluído com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
        await fetchGames();
      }
    } catch (err) {
      console.error('Error deleting game:', err);
      setError('Erro ao excluir o jogo');
    }
  };

  const clearGameParticipations = async (gameId: string) => {
    try {
      const { error } = await supabase
        .from('game_participants')
        .delete()
        .eq('game_id', gameId);

      if (error) throw error;
    } catch (err) {
      console.error('Error clearing game participations:', err);
      throw new Error('Erro ao limpar as confirmações de presença');
    }
  };

  const handleSaveEdit = async () => {
    if (!editedGame) return;

    try {
      // If status is Cancelado, ensure we have a cancellation reason
      if (editedGame.status === 'Cancelado' && !editedGame.cancellation_reason && !newCancellationReason) {
        setError('É necessário informar o motivo do cancelamento');
        return;
      }

      let finalCancellationReason = editedGame.cancellation_reason;

      // If it's a new cancellation reason, add it
      if (editedGame.status === 'Cancelado' && newCancellationReason) {
        try {
          const { data: result, error: reasonError } = await supabase
            .rpc('manage_cancellation_reason', {
              p_reason: newCancellationReason
            });

          if (reasonError) throw reasonError;
          
          finalCancellationReason = result;
          
          // Refresh cancellation reasons list
          await fetchCancellationReasons();
        } catch (err) {
          console.error('Error managing cancellation reason:', err);
          setError('Erro ao adicionar motivo de cancelamento');
          return;
        }
      }

      const updateData = {
        date: editedGame.date,
        field: editedGame.field,
        status: editedGame.status,
        cancellation_reason: editedGame.status === 'Cancelado' ? 
          finalCancellationReason : 
          null
      };

      // If the game is being cancelled, clear all participations
      if (editedGame.status === 'Cancelado') {
        await clearGameParticipations(editedGame.id);
      }

      const { error } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', editedGame.id);

      if (error) throw error;

      await fetchGames();
      if (selectedGame?.id === editedGame.id) {
        await fetchParticipants(editedGame.id);
      }
      setShowEditModal(false);
      setNewCancellationReason('');
      setSuccess('Jogo atualizado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating game:', err);
      setError('Erro ao atualizar o jogo');
    }
  };

  const handleUpdateParticipant = async (memberId: string, confirmed: boolean | null) => {
    if (!selectedGame) return;

    try {
      const { error } = await supabase
        .from('game_participants')
        .update({ confirmed })
        .eq('game_id', selectedGame.id)
        .eq('member_id', memberId);

      if (error) throw error;

      await fetchParticipants(selectedGame.id);
      await fetchGames();
    } catch (err) {
      console.error('Error updating participant:', err);
      setError('Erro ao atualizar participante');
    }
  };

  const generateWhatsAppMessage = (game: Game) => {
    const gameDate = formatDate(game.date);
    const message = `🎮 Confirmação de Jogo\n\n📅 Data: ${gameDate}\n🏟️ Local: ${game.field}\n\nPara confirmar sua presença, acesse:`;
    return encodeURIComponent(message);
  };

  const handleShareWhatsApp = async (game: Game) => {
    try {
      const { data: participants, error } = await supabase
        .from('game_participants')
        .select(`
          member_id,
          members (
            phone,
            nickname
          )
        `)
        .eq('game_id', game.id)
        .is('confirmed', null)
        .not('members.phone', 'is', null); // Only get participants with phone numbers

      if (error) throw error;

      if (participants && participants.length > 0) {
        const message = generateWhatsAppMessage(game);
        const confirmationUrl = `${SITE_URL}/game-confirmation/${game.id}`;
        
        // Open WhatsApp with the first pending participant that has a phone number
        const firstParticipant = participants[0];
        const phone = firstParticipant.members.phone.replace(/\D/g, ''); // Remove non-digits
        window.open(`https://wa.me/${phone}?text=${message} ${confirmationUrl}`, '_blank');

        setSuccess('Link do WhatsApp gerado com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Não há participantes pendentes com telefone cadastrado para este jogo.');
      }
    } catch (err) {
      console.error('Error generating WhatsApp link:', err);
      setError('Erro ao gerar link do WhatsApp');
    }
  };

  const handleShareParticipantsList = async (game: Game) => {
    try {
      setSuccess('Carregando participantes...');
      
      // Buscar participantes diretamente do banco de dados
      const { data: participantsData, error } = await supabase
        .from('game_participants')
        .select(`
          member_id,
          members (
            nickname
          ),
          confirmed
        `)
        .eq('game_id', game.id);

      if (error) throw error;

      if (!participantsData) {
        throw new Error('Não foi possível carregar os participantes');
      }

      // Organizar participantes por status
      const confirmedList = participantsData
        .filter(p => p.confirmed === true)
        .map(p => p.members.nickname);
      
      const declinedList = participantsData
        .filter(p => p.confirmed === false)
        .map(p => p.members.nickname);
      
      const pendingList = participantsData
        .filter(p => p.confirmed === null)
        .map(p => p.members.nickname);
      
      const gameDate = formatDate(game.date);
      
      // Criar a mensagem com a lista de participantes
      let message = `*🎮 Lista de Participantes - ${gameDate} - ${game.field}*\n\n`;
      
      // Adicionar confirmados
      message += `*✅ Confirmados (${confirmedList.length}):*\n`;
      if (confirmedList.length > 0) {
        confirmedList.forEach((nickname, index) => {
          message += `${index + 1}. ${nickname}\n`;
        });
      } else {
        message += "Ninguém confirmou ainda\n";
      }
      
      // Adicionar recusados
      message += `\n*❌ Não vão (${declinedList.length}):*\n`;
      if (declinedList.length > 0) {
        declinedList.forEach((nickname, index) => {
          message += `${index + 1}. ${nickname}\n`;
        });
      } else {
        message += "Ninguém recusou ainda\n";
      }
      
      // Adicionar pendentes
      message += `\n*⏳ Não informaram (${pendingList.length}):*\n`;
      if (pendingList.length > 0) {
        pendingList.forEach((nickname, index) => {
          message += `${index + 1}. ${nickname}\n`;
        });
      } else {
        message += "Todos já responderam\n";
      }
      
      // Adicionar link para confirmação
      message += `\n🔗 Link para confirmar: ${SITE_URL}/game-confirmation/${game.id}/`;
      
      // Abrir WhatsApp com a mensagem
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      
      setSuccess('Lista de participantes compartilhada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error sharing participants list:', err);
      setError('Erro ao compartilhar lista de participantes');
    }
  };

  const handleFormTeams = (gameId: string) => {
    navigate(`/games/teams/${gameId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Agendado':
        return 'text-blue-600 bg-blue-50';
      case 'Realizado':
        return 'text-green-600 bg-green-50';
      case 'Cancelado':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Agendado':
        return <Calendar className="w-4 h-4" />;
      case 'Realizado':
        return <Check className="w-4 h-4" />;
      case 'Cancelado':
        return <X className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Jogos</h1>
        {isAdmin && (
          <button
            onClick={() => navigate('/games/create')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Jogo
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-4">
          {games.map((game) => (
            <div
              key={game.id}
              className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-semibold">
                        {formatDate(game.date)}
                      </p>
                      <p className="text-sm text-gray-600">{game.field}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(game.status)}`}>
                      {getStatusIcon(game.status)}
                      <span>{game.status}</span>
                    </span>
                    {game.status === 'Cancelado' && game.cancellation_reason && (
                      <span className="text-sm text-gray-500">
                        Motivo: {game.cancellation_reason}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <button
                    onClick={() => handleShowParticipants(game)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                  >
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-green-600">
                          <UserCheck className="w-4 h-4 mr-1" />
                          <span className="text-sm">{game.participants.confirmed}</span>
                        </div>
                        <div className="flex items-center text-red-600">
                          <UserX className="w-4 h-4 mr-1" />
                          <span className="text-sm">{game.participants.declined}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <UserMinus className="w-4 h-4 mr-1" />
                          <span className="text-sm">{game.participants.pending}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 text-center mt-1">Ver detalhes</p>
                    </div>
                  </button>
                  {isAdmin && (
                    <div className="flex items-center space-x-2">
                      {game.status === 'Agendado' && (
                        <>
                          {game.participants.pending > 0 && (
                            <button
                              onClick={() => handleShareWhatsApp(game)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Enviar confirmação via WhatsApp"
                            >
                              <Share2 className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleShareParticipantsList(game)}
                            className="text-green-600 hover:text-green-900"
                            title="Compartilhar lista de participantes no WhatsApp"
                          >
                            <MessageCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {game.status !== 'Cancelado' && (
                        <button
                          onClick={() => handleFormTeams(game.id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Formar Times"
                        >
                          <ShieldCheck className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(game)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(game.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {games.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              Nenhum jogo agendado
            </p>
          )}
        </div>
      </div>

      {/* Modal de Edição */}
      {showEditModal && editedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Editar Jogo</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Data</label>
                <input
                  type="date"
                  value={editedGame.date}
                  onChange={(e) => setEditedGame({ ...editedGame, date: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Campo</label>
                <select
                  value={editedGame.field}
                  onChange={(e) => setEditedGame({ ...editedGame, field: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option>Campo Principal</option>
                  <option>Campo de Chuva</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={editedGame.status}
                  onChange={(e) => setEditedGame({
                    ...editedGame,
                    status: e.target.value,
                    cancellation_reason: e.target.value !== 'Cancelado' ? null : editedGame.cancellation_reason
                  })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Agendado">Agendado</option>
                  <option value="Realizado">Realizado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              {editedGame.status === 'Cancelado' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Motivo do Cancelamento
                  </label>
                  <select
                    value={editedGame.cancellation_reason || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'new') {
                        setEditedGame({ ...editedGame, cancellation_reason: null });
                      } else {
                        setEditedGame({ ...editedGame, cancellation_reason: value });
                        setNewCancellationReason('');
                      }
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Selecione um motivo</option>
                    {cancellationReasons.map((reason) => (
                      <option key={reason.reason} value={reason.reason}>
                        {reason.reason}
                      </option>
                    ))}
                    <option value="new">Outro motivo...</option>
                  </select>

                  {!editedGame.cancellation_reason && (
                    <input
                      type="text"
                      value={newCancellationReason}
                      onChange={(e) => setNewCancellationReason(e.target.value)}
                      placeholder="Digite o novo motivo"
                      className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setNewCancellationReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Participantes */}
      {showParticipantsModal && selectedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                Participantes - {formatDate(selectedGame.date)}
              </h2>
              <div className="flex items-center space-x-3">
                {selectedGame.status !== 'Cancelado' && (
                  <button
                    onClick={() => {
                      setShowParticipantsModal(false);
                      handleFormTeams(selectedGame.id);
                    }}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Formar Times
                  </button>
                )}
                {isAdmin && selectedGame.status === 'Agendado' && (
                  <button
                    onClick={() => {
                      setShowParticipantsModal(false);
                      handleShareParticipantsList(selectedGame);
                    }}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Compartilhar Lista
                  </button>
                )}
                <button
                  onClick={() => setShowParticipantsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {isLoadingParticipants ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
                <span className="ml-3 text-gray-600">Carregando participantes...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Vai Jogar */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <UserCheck className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="font-semibold text-green-800">
                      Vai Jogar ({participants.confirmed.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {participants.confirmed.map((member) => (
                      <div key={member.member_id} className="flex items-center justify-between bg-white p-2 rounded">
                        <span>{member.nickname}</span>
                        {isAdmin && (
                          <button
                            onClick={() => handleUpdateParticipant(member.member_id, null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {participants.confirmed.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        Nenhum jogador confirmado
                      </div>
                    )}
                  </div>
                </div>

                {/* Não Vai Jogar */}
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <UserX className="w-5 h-5 text-red-600 mr-2" />
                    <h3 className="font-semibold text-red-800">
                      Não Vai Jogar ({participants.declined.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {participants.declined.map((member) => (
                      <div key={member.member_id} className="flex items-center justify-between bg-white p-2 rounded">
                        <span>{member.nickname}</span>
                        {isAdmin && (
                          <button
                            onClick={() => handleUpdateParticipant(member.member_id, null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {participants.declined.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        Nenhum jogador recusou
                      </div>
                    )}
                  </div>
                </div>

                {/* Não Informou */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <UserMinus className="w-5 h-5 text-gray-600 mr-2" />
                    <h3 className="font-semibold text-gray-800">
                      Não Informou ({participants.pending.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {participants.pending.map((member) => (
                      <div key={member.member_id} className="flex items-center justify-between bg-white p-2 rounded">
                        <span>{member.nickname}</span>
                        {isAdmin && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleUpdateParticipant(member.member_id, true)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateParticipant(member.member_id, false)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {participants.pending.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        Todos já responderam
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}