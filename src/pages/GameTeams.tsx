import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ArrowLeft, ShieldCheck, ShieldX, Shuffle, Save, Users, UserCheck, Goal, Shield, Award, PlusCircle, X, Trash2, AlertTriangle, Play, Store as Stop } from 'lucide-react';

interface Game {
  id: string;
  date: string;
  field: string;
  status: string;
  club_id: string;
}

interface Member {
  id: string;
  nickname: string;
  photo_url: string | null;
}

interface GameParticipant {
  id: string;
  game_id: string;
  member_id: string;
  confirmed: boolean | null;
  team: 'A' | 'B' | null;
  members: Member;
}

interface GameStatistic {
  id: string;
  game_id: string;
  member_id: string;
  statistic_type: 'goal' | 'own_goal' | 'save' | 'assist';
  assist_by: string | null;
  team: 'A' | 'B';
  member: {
    nickname: string;
    photo_url: string | null;
  };
  assist: {
    nickname: string;
    photo_url: string | null;
  } | null;
  club_id: string;
}

export default function GameTeams() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [confirmedMembers, setConfirmedMembers] = useState<GameParticipant[]>([]);
  const [teamA, setTeamA] = useState<GameParticipant[]>([]);
  const [teamB, setTeamB] = useState<GameParticipant[]>([]);
  const [unassigned, setUnassigned] = useState<GameParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statistics, setStatistics] = useState<GameStatistic[]>([]);
  const [showStatModal, setShowStatModal] = useState(false);
  const [showAssistModal, setShowAssistModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GameParticipant | null>(null);
  const [selectedStatType, setSelectedStatType] = useState<'goal' | 'own_goal' | 'save' | null>(null);
  const [selectedAssistMember, setSelectedAssistMember] = useState<string | null>(null);
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [showEndGameModal, setShowEndGameModal] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    if (gameId) {
      fetchGame();
      fetchParticipants();
      fetchStatistics();
    }
  }, [gameId]);

  useEffect(() => {
    console.log('Statistics changed:', statistics);
    calculateScores();
  }, [statistics]);

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

  const fetchGame = async () => {
    try {
      if (!gameId) return;

      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) throw error;
      setGame(data);
      
      // Check if game is already in progress or completed
      if (data.status === 'Realizado') {
        setGameStarted(true);
      }
    } catch (err) {
      console.error('Error fetching game:', err);
      setError('Erro ao carregar o jogo');
    }
  };

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      if (!gameId) return;

      const { data, error } = await supabase
        .from('game_participants')
        .select(`
          id,
          game_id,
          member_id,
          confirmed,
          team,
          members:members (
            id,
            nickname,
            photo_url
          )
        `)
        .eq('game_id', gameId)
        .eq('confirmed', true);

      if (error) throw error;

      if (data) {
        setConfirmedMembers(data);
        
        // Separate members into teams
        const teamAMembers = data.filter(p => p.team === 'A');
        const teamBMembers = data.filter(p => p.team === 'B');
        const unassignedMembers = data.filter(p => p.team === null);
        
        setTeamA(teamAMembers);
        setTeamB(teamBMembers);
        setUnassigned(unassignedMembers);
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
      setError('Erro ao carregar participantes');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      if (!gameId) return;

      console.log('Fetching statistics for game:', gameId);

      const { data, error } = await supabase
        .from('game_statistics')
        .select(`
          id,
          game_id,
          member_id,
          statistic_type,
          assist_by,
          team,
          member:members!game_statistics_member_id_fkey (
            nickname,
            photo_url
          ),
          assist:members!game_statistics_assist_by_fkey (
            nickname,
            photo_url
          ),
          club_id
        `)
        .eq('game_id', gameId);

      if (error) {
        console.error('Error fetching statistics:', error);
        throw error;
      }

      console.log('Statistics fetched:', data);

      if (data) {
        setStatistics(data);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Erro ao carregar estatísticas');
    }
  };

  const calculateScores = () => {
    console.log('Calculating scores from statistics:', statistics);
    
    if (!statistics.length) {
      setTeamAScore(0);
      setTeamBScore(0);
      return;
    }

    let scoreA = 0;
    let scoreB = 0;

    statistics.forEach(stat => {
      console.log('Processing stat:', stat);
      
      if (stat.statistic_type === 'goal') {
        if (stat.team === 'A') {
          scoreA++;
          console.log('Goal for team A, score:', scoreA);
        } else if (stat.team === 'B') {
          scoreB++;
          console.log('Goal for team B, score:', scoreB);
        }
      } else if (stat.statistic_type === 'own_goal') {
        if (stat.team === 'A') {
          scoreB++;
          console.log('Own goal by team A, score B:', scoreB);
        } else if (stat.team === 'B') {
          scoreA++;
          console.log('Own goal by team B, score A:', scoreA);
        }
      }
    });

    console.log('Final scores - A:', scoreA, 'B:', scoreB);
    setTeamAScore(scoreA);
    setTeamBScore(scoreB);
  };

  const handleAssignTeam = async (participantId: string, team: 'A' | 'B' | null) => {
    try {
      // Don't allow team changes if game has started
      if (gameStarted) {
        setError('Não é possível alterar times após o início da partida');
        return;
      }
      
      // Find the participant in all teams
      const allParticipants = [...teamA, ...teamB, ...unassigned];
      const participant = allParticipants.find(p => p.id === participantId);
      
      if (!participant) return;
      
      // Remove from current team
      setTeamA(teamA.filter(p => p.id !== participantId));
      setTeamB(teamB.filter(p => p.id !== participantId));
      setUnassigned(unassigned.filter(p => p.id !== participantId));
      
      // Add to new team
      const updatedParticipant = { ...participant, team };
      
      if (team === 'A') {
        setTeamA([...teamA, updatedParticipant]);
      } else if (team === 'B') {
        setTeamB([...teamB, updatedParticipant]);
      } else {
        setUnassigned([...unassigned, updatedParticipant]);
      }
    } catch (err) {
      console.error('Error assigning team:', err);
      setError('Erro ao atribuir time');
    }
  };

  const handleSaveTeams = async () => {
    try {
      // Don't allow team changes if game has started
      if (gameStarted) {
        setError('Não é possível alterar times após o início da partida');
        return;
      }
      
      // Prepare updates for all participants
      const updates = [
        ...teamA.map(p => ({ id: p.id, team: 'A' })),
        ...teamB.map(p => ({ id: p.id, team: 'B' })),
        ...unassigned.map(p => ({ id: p.id, team: null }))
      ];
      
      // Update each participant
      for (const update of updates) {
        const { error } = await supabase
          .from('game_participants')
          .update({ team: update.team })
          .eq('id', update.id);
          
        if (error) throw error;
      }
      
      setSuccess('Times salvos com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving teams:', err);
      setError('Erro ao salvar times');
    }
  };

  const handleRandomizeTeams = () => {
    // Don't allow team changes if game has started
    if (gameStarted) {
      setError('Não é possível sortear times após o início da partida');
      return;
    }
    
    // Combine all members
    const allMembers = [...teamA, ...teamB, ...unassigned];
    
    // Shuffle array
    const shuffled = [...allMembers].sort(() => Math.random() - 0.5);
    
    // Split into two teams
    const halfIndex = Math.ceil(shuffled.length / 2);
    const newTeamA = shuffled.slice(0, halfIndex);
    const newTeamB = shuffled.slice(halfIndex);
    
    setTeamA(newTeamA);
    setTeamB(newTeamB);
    setUnassigned([]);
  };

  const handleOpenStatModal = (participant: GameParticipant) => {
    setSelectedMember(participant);
    setShowStatModal(true);
  };

  const handleSelectStatType = (type: 'goal' | 'own_goal' | 'save') => {
    setSelectedStatType(type);
    
    if (type === 'goal') {
      setShowAssistModal(true);
    } else {
      handleSaveStat(type, null);
    }
  };

  const handleSelectAssist = (memberId: string | null) => {
    handleSaveStat('goal', memberId);
    setShowAssistModal(false);
  };

  const handleSaveStat = async (type: 'goal' | 'own_goal' | 'save', assistById: string | null) => {
    try {
      if (!selectedMember || !gameId) return;

      // If game hasn't started yet, start it automatically when recording stats
      if (!gameStarted && game?.status === 'Agendado') {
        await handleStartGame();
      }

      // Get the game to ensure we have the club_id
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('club_id')
        .eq('id', gameId)
        .single();

      if (gameError) {
        console.error('Error fetching game:', gameError);
        throw gameError;
      }

      console.log('Game data:', gameData);

      const newStat = {
        game_id: gameId,
        member_id: selectedMember.member_id,
        statistic_type: type,
        assist_by: assistById,
        team: selectedMember.team,
        club_id: gameData.club_id
      };

      console.log('Inserting statistic:', newStat);

      const { data, error } = await supabase
        .from('game_statistics')
        .insert([newStat])
        .select();

      if (error) {
        console.error('Error saving statistic:', error);
        throw error;
      }

      console.log('Statistic saved:', data);

      setSuccess(`${type === 'goal' ? 'Gol' : type === 'own_goal' ? 'Gol contra' : 'Defesa'} registrado com sucesso!`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Reset state
      setSelectedMember(null);
      setSelectedStatType(null);
      setSelectedAssistMember(null);
      setShowStatModal(false);
      
      // Refresh statistics
      await fetchStatistics();
    } catch (err) {
      console.error('Error saving statistic:', err);
      setError('Erro ao salvar estatística');
    }
  };

  const handleDeleteStat = async (statId: string) => {
    try {
      if (!window.confirm('Tem certeza que deseja excluir esta estatística?')) return;

      const { error } = await supabase
        .from('game_statistics')
        .delete()
        .eq('id', statId);

      if (error) throw error;

      setSuccess('Estatística excluída com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh statistics
      await fetchStatistics();
    } catch (err) {
      console.error('Error deleting statistic:', err);
      setError('Erro ao excluir estatística');
    }
  };

  const handleStartGame = async () => {
    try {
      if (!gameId) return;
      
      // Check if teams are balanced
      if (teamA.length === 0 || teamB.length === 0) {
        setError('É necessário ter jogadores em ambos os times para iniciar a partida');
        return;
      }
      
      // Set game as started locally
      setGameStarted(true);
      
      setSuccess('Partida iniciada! Os times não podem mais ser alterados.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error starting game:', err);
      setError('Erro ao iniciar a partida');
    }
  };

  const handleEndGame = async () => {
    try {
      if (!gameId) return;
      
      // Update game status to Realizado
      const { error } = await supabase
        .from('games')
        .update({ status: 'Realizado' })
        .eq('id', gameId);
        
      if (error) throw error;
      
      // Update local game state
      if (game) {
        setGame({
          ...game,
          status: 'Realizado'
        });
      }
      
      setShowEndGameModal(false);
      setSuccess('Partida finalizada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error ending game:', err);
      setError('Erro ao finalizar a partida');
    }
  };

  const getStatIcon = (type: string) => {
    switch (type) {
      case 'goal':
        return <Goal className="w-4 h-4 text-green-600" />;
      case 'own_goal':
        return <Goal className="w-4 h-4 text-red-600" />;
      case 'save':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'assist':
        return <Award className="w-4 h-4 text-purple-600" />;
      default:
        return null;
    }
  };

  const getStatText = (stat: GameStatistic) => {
    switch (stat.statistic_type) {
      case 'goal':
        return `Gol de ${stat.member.nickname}${stat.assist ? ` (Assistência: ${stat.assist.nickname})` : ''}`;
      case 'own_goal':
        return `Gol contra de ${stat.member.nickname}`;
      case 'save':
        return `Defesa de ${stat.member.nickname}`;
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center text-gray-600 mt-8">
        Jogo não encontrado.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-full">
      <div className="flex flex-wrap items-center mb-4 sm:mb-6">
        <button
          onClick={() => navigate('/games')}
          className="mr-3 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <span>Formação de Times</span>
            {game.status === 'Realizado' && (
              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                Finalizado
              </span>
            )}
            {gameStarted && game.status !== 'Realizado' && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                Em andamento
              </span>
            )}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {format(new Date(game.date), 'dd/MM/yyyy')} • {game.field}
          </p>
        </div>
        
        {/* Game control buttons */}
        {isAdmin && (
          <div className="ml-auto flex space-x-2">
            {!gameStarted && game.status === 'Agendado' && (
              <button
                onClick={handleStartGame}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Play className="w-4 h-4 mr-1" />
                <span>Iniciar Partida</span>
              </button>
            )}
            
            {(gameStarted || game.status === 'Realizado') && game.status !== 'Realizado' && (
              <button
                onClick={() => setShowEndGameModal(true)}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
              >
                <Stop className="w-4 h-4 mr-1" />
                <span>Finalizar Partida</span>
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
          {success}
        </div>
      )}

      {/* Scoreboard - Responsive */}
      <div className="mb-4 sm:mb-6 bg-gray-800 text-white rounded-lg p-3 sm:p-4">
        <h2 className="text-center text-base sm:text-lg font-semibold mb-2">Placar</h2>
        <div className="flex flex-col sm:flex-row justify-center items-center text-xl sm:text-3xl font-bold">
          <div className="text-white mb-2 sm:mb-0">Time Branco</div>
          <div className="mx-2 sm:mx-4 flex items-center">
            <span className="bg-white text-gray-800 px-3 py-1 rounded-l-lg">{teamAScore}</span>
            <span className="mx-2">x</span>
            <span className="bg-green-500 text-white px-3 py-1 rounded-r-lg">{teamBScore}</span>
          </div>
          <div className="text-green-400 mt-2 sm:mt-0">Time Verde</div>
        </div>
      </div>

      {/* Action Buttons - Responsive */}
      <div className="mb-4 sm:mb-6 flex flex-wrap gap-2 sm:gap-4">
        <button
          onClick={handleRandomizeTeams}
          disabled={gameStarted || game.status === 'Realizado'}
          className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 text-sm rounded-lg flex items-center justify-center ${
            gameStarted || game.status === 'Realizado'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 transition-colors'
          }`}
        >
          <Shuffle className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          <span>Sortear</span>
        </button>
        
        <button
          onClick={handleSaveTeams}
          disabled={gameStarted || game.status === 'Realizado'}
          className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 text-sm rounded-lg flex items-center justify-center ${
            gameStarted || game.status === 'Realizado'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 transition-colors'
          }`}
        >
          <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          <span>Salvar</span>
        </button>
      </div>

      {/* Teams Grid - Horizontal Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Team A - Branco */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border-2 border-gray-200">
          <div className="flex items-center mb-3 sm:mb-4">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white border border-gray-300 rounded-full mr-2"></div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              Time Branco ({teamA.length})
            </h2>
          </div>
          
          <div 
            id="teamA"
            className="min-h-[150px] sm:min-h-[200px] space-y-2 p-2 rounded-lg bg-white"
          >
            {teamA.map((participant) => (
              <div 
                key={participant.id}
                className="bg-gray-50 p-2 sm:p-3 rounded-lg shadow-sm flex items-center justify-between border border-gray-200"
              >
                <div 
                  className="flex items-center cursor-pointer overflow-hidden"
                  onClick={() => handleOpenStatModal(participant)}
                >
                  {participant.members.photo_url ? (
                    <img
                      src={participant.members.photo_url}
                      alt={participant.members.nickname}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover mr-2 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2 flex-shrink-0">
                      <span className="text-gray-500 text-xs sm:text-sm">
                        {participant.members.nickname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="font-medium text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">
                    {participant.members.nickname}
                  </span>
                </div>
                {!gameStarted && game.status !== 'Realizado' && (
                  <div className="flex space-x-1 flex-shrink-0">
                    <button
                      onClick={() => handleAssignTeam(participant.id, null)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      title="Remover do time"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAssignTeam(participant.id, 'B')}
                      className="p-1 text-green-400 hover:text-green-600 rounded-full hover:bg-green-50"
                      title="Mover para Time Verde"
                    >
                      <ShieldX className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {teamA.length === 0 && (
              <div className="text-center py-6 sm:py-8 text-gray-400 text-sm">
                Arraste jogadores para este time
              </div>
            )}
          </div>
        </div>

        {/* Team B - Verde */}
        <div className="bg-green-50 rounded-lg p-3 sm:p-4 border-2 border-green-200">
          <div className="flex items-center mb-3 sm:mb-4">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full mr-2"></div>
            <h2 className="text-lg sm:text-xl font-semibold text-green-800">
              Time Verde ({teamB.length})
            </h2>
          </div>
          
          <div 
            id="teamB"
            className="min-h-[150px] sm:min-h-[200px] space-y-2 p-2 rounded-lg bg-green-100/50"
          >
            {teamB.map((participant) => (
              <div 
                key={participant.id}
                className="bg-white p-2 sm:p-3 rounded-lg shadow-sm flex items-center justify-between"
              >
                <div 
                  className="flex items-center cursor-pointer overflow-hidden"
                  onClick={() => handleOpenStatModal(participant)}
                >
                  {participant.members.photo_url ? (
                    <img
                      src={participant.members.photo_url}
                      alt={participant.members.nickname}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover mr-2"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                      <span className="text-gray-500 text-xs sm:text-sm">
                        {participant.members.nickname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="font-medium text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">
                    {participant.members.nickname}
                  </span>
                </div>
                {!gameStarted && game.status !== 'Realizado' && (
                  <div className="flex space-x-1 flex-shrink-0">
                    <button
                      onClick={() => handleAssignTeam(participant.id, null)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      title="Remover do time"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAssignTeam(participant.id, 'A')}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      title="Mover para Time Branco"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {teamB.length === 0 && (
              <div className="text-center py-6 sm:py-8 text-green-400 text-sm">
                Arraste jogadores para este time
              </div>
            )}
          </div>
        </div>

        {/* Unassigned */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <div className="flex items-center mb-3 sm:mb-4">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 mr-2" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              Não Atribuídos ({unassigned.length})
            </h2>
          </div>
          
          <div 
            id="unassigned"
            className="min-h-[150px] sm:min-h-[200px] space-y-2 p-2 rounded-lg bg-gray-100/50"
          >
            {unassigned.map((participant) => (
              <div 
                key={participant.id}
                className="bg-white p-2 sm:p-3 rounded-lg shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center overflow-hidden">
                  {participant.members.photo_url ? (
                    <img
                      src={participant.members.photo_url}
                      alt={participant.members.nickname}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover mr-2"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                      <span className="text-gray-500 text-xs sm:text-sm">
                        {participant.members.nickname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="font-medium text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">
                    {participant.members.nickname}
                  </span>
                </div>
                {!gameStarted && game.status !== 'Realizado' && (
                  <div className="flex space-x-1 flex-shrink-0">
                    <button
                      onClick={() => handleAssignTeam(participant.id, 'A')}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      title="Adicionar ao Time Branco"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAssignTeam(participant.id, 'B')}
                      className="p-1 text-green-400 hover:text-green-600 rounded-full hover:bg-green-50"
                      title="Adicionar ao Time Verde"
                    >
                      <ShieldX className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {unassigned.length === 0 && (
              <div className="text-center py-6 sm:py-8 text-gray-400 text-sm">
                Todos os jogadores foram atribuídos
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Statistics - Responsive */}
      <div className="mt-6 sm:mt-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Estatísticas do Jogo</h2>
        
        {statistics.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <div className="space-y-2">
              {statistics.map(stat => (
                <div key={stat.id} className="flex items-center justify-between p-2 border-b text-sm sm:text-base">
                  <div className="flex items-center overflow-hidden">
                    {getStatIcon(stat.statistic_type)}
                    <span className="ml-2 truncate max-w-[180px] sm:max-w-none">{getStatText(stat)}</span>
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    <span className="mr-2 text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                      (Time {stat.team === 'A' ? 'Branco' : 'Verde'})
                    </span>
                    <button
                      onClick={() => handleDeleteStat(stat.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6 text-center text-gray-500">
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-sm sm:text-base">Nenhuma estatística registrada para este jogo.</p>
            <p className="text-xs sm:text-sm mt-2">Clique em um jogador para registrar gols, defesas ou assistências.</p>
          </div>
        )}
      </div>

      {/* Statistic Modal - Responsive */}
      {showStatModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-xs sm:max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold">
                Registrar Estatística
              </h2>
              <button
                onClick={() => setShowStatModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            
            <div className="mb-4 flex items-center">
              {selectedMember.members.photo_url ? (
                <img
                  src={selectedMember.members.photo_url}
                  alt={selectedMember.members.nickname}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover mr-3"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                  <span className="text-gray-500 text-base sm:text-lg">
                    {selectedMember.members.nickname.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold text-base sm:text-lg">{selectedMember.members.nickname}</p>
                <p className="text-xs sm:text-sm text-gray-600">
                  Time {selectedMember.team === 'A' ? 'Branco' : 'Verde'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <button
                onClick={() => handleSelectStatType('goal')}
                className="flex flex-col items-center justify-center p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <Goal className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mb-1 sm:mb-2" />
                <span className="text-xs sm:text-sm font-medium">Gol</span>
              </button>
              
              <button
                onClick={() => handleSelectStatType('own_goal')}
                className="flex flex-col items-center justify-center p-3 sm:p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Goal className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 mb-1 sm:mb-2" />
                <span className="text-xs sm:text-sm font-medium">Gol Contra</span>
              </button>
              
              <button
                onClick={() => handleSelectStatType('save')}
                className="flex flex-col items-center justify-center p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mb-1 sm:mb-2" />
                <span className="text-xs sm:text-sm font-medium">Defesa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assist Modal - Responsive */}
      {showAssistModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-xs sm:max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold">
                Quem fez a assistência?
              </h2>
              <button
                onClick={() => {
                  setShowAssistModal(false);
                  handleSaveStat('goal', null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600">Selecione o jogador que fez a assistência para o gol de <span className="font-semibold">{selectedMember.members.nickname}</span> ou clique em "Sem Assistência".</p>
            </div>
            
            <div className="max-h-40 sm:max-h-60 overflow-y-auto mb-4">
              <div className="space-y-2">
                {/* Show only players from the same team */}
                {(selectedMember.team === 'A' ? teamA : teamB)
                  .filter(p => p.member_id !== selectedMember.member_id)
                  .map(participant => (
                    <div
                      key={participant.member_id}
                      onClick={() => handleSelectAssist(participant.member_id)}
                      className="flex items-center p-2 sm:p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer"
                    >
                      {participant.members.photo_url ? (
                        <img
                          src={participant.members.photo_url}
                          alt={participant.members.nickname}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover mr-2"
                        />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                          <span className="text-gray-500 text-xs sm:text-sm">
                            {participant.members.nickname.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium text-sm sm:text-base">{participant.members.nickname}</span>
                    </div>
                  ))}
              </div>
            </div>
            
            <button
              onClick={() => handleSelectAssist(null)}
              className="w-full py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 font-medium text-sm sm:text-base"
            >
              Sem Assistência
            </button>
          </div>
        </div>
      )}

      {/* End Game Confirmation Modal */}
      {showEndGameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <Stop className="w-6 h-6 text-red-600 mr-2" />
              <h2 className="text-xl font-bold">Finalizar Partida</h2>
            </div>
            
            <p className="mb-6 text-gray-600">
              Tem certeza que deseja finalizar esta partida? O status do jogo será alterado para "Realizado".
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowEndGameModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEndGame}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Finalizar Partida
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}