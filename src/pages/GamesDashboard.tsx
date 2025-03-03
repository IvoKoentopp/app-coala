import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Trophy, Clock, UserCheck, UserX, UserMinus, Gift, Goal, Shield, Award, Medal, Percent, Zap } from 'lucide-react';
import { format, differenceInYears, parse, isBefore, isAfter, startOfMonth, getMonth, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GameStats {
  total: number;
  completed: number;
  cancelled: number;
  completionRate: number;
  byField: {
    [key: string]: number;
  };
  byMonth: {
    [key: string]: number;
  };
  averageParticipation: number;
  participationStats: {
    confirmed: number;
    declined: number;
    pending: number;
    total: number;
  };
  cancellationReasons: {
    reason: string;
    count: number;
  }[];
  memberParticipation: {
    nickname: string;
    gamesPlayed: number;
    participationRate: number;
  }[];
}

interface PlayerStats {
  nickname: string;
  photo_url: string | null;
  goals: number;
  own_goals: number;
  saves: number;
  assists: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  goal_average: number;
  points: number;
}

interface TeamResult {
  game_id: string;
  team: 'A' | 'B';
  score_a: number;
  score_b: number;
  result: 'win' | 'loss' | 'draw';
}

export default function GamesDashboard() {
  const [stats, setStats] = useState<GameStats>({
    total: 0,
    completed: 0,
    cancelled: 0,
    completionRate: 0,
    byField: {},
    byMonth: {},
    averageParticipation: 0,
    participationStats: {
      confirmed: 0,
      declined: 0,
      pending: 0,
      total: 0
    },
    cancellationReasons: [],
    memberParticipation: []
  });
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'games' | 'players'>('games');
  const [sortField, setSortField] = useState<keyof PlayerStats>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchStats();
    fetchPlayerStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1).toISOString();
      const endDate = new Date(currentYear, 11, 31).toISOString();

      // Fetch all games for basic stats (only Realizado and Cancelado)
      const { data: allGames, error: allGamesError } = await supabase
        .from('games')
        .select('*')
        .in('status', ['Realizado', 'Cancelado'])
        .gte('date', startDate)
        .lte('date', endDate);

      if (allGamesError) throw allGamesError;

      // Fetch completed games and their participants
      const { data: completedGames, error: completedGamesError } = await supabase
        .from('games')
        .select(`
          *,
          game_participants(*, members(nickname, birth_date, start_month))
        `)
        .eq('status', 'Realizado')
        .gte('date', startDate)
        .lte('date', endDate);

      if (completedGamesError) throw completedGamesError;

      if (allGames && completedGames) {
        // Basic stats
        const total = allGames.length;
        const completed = completedGames.length;
        const cancelled = allGames.filter(g => g.status === 'Cancelado').length;
        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        // Games by field
        const byField = completedGames.reduce((acc: { [key: string]: number }, game) => {
          acc[game.field] = (acc[game.field] || 0) + 1;
          return acc;
        }, {});

        // Games by month
        const byMonth = completedGames.reduce((acc: { [key: string]: number }, game) => {
          const month = format(parse(game.date, 'yyyy-MM-dd', new Date()), 'MMMM', { locale: ptBR });
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});

        // Participation stats with averages
        let totalConfirmed = 0;
        let totalDeclined = 0;
        let totalPending = 0;
        let totalParticipants = 0;

        completedGames.forEach(game => {
          if (game.game_participants) {
            const confirmed = game.game_participants.filter(p => p.confirmed === true).length;
            const declined = game.game_participants.filter(p => p.confirmed === false).length;
            const pending = game.game_participants.filter(p => p.confirmed === null).length;

            totalConfirmed += confirmed;
            totalDeclined += declined;
            totalPending += pending;
            totalParticipants += game.game_participants.length;
          }
        });

        // Calculate averages
        const averageConfirmed = completed > 0 ? totalConfirmed / completed : 0;
        const averageDeclined = completed > 0 ? totalDeclined / completed : 0;
        const averagePending = completed > 0 ? totalPending / completed : 0;
        const averageTotal = completed > 0 ? totalParticipants / completed : 0;

        // Cancellation reasons
        const cancellationReasons = allGames
          .filter(g => g.status === 'Cancelado' && g.cancellation_reason)
          .reduce((acc: { [key: string]: number }, game) => {
            acc[game.cancellation_reason] = (acc[game.cancellation_reason] || 0) + 1;
            return acc;
          }, {});

        const formattedCancellationReasons = Object.entries(cancellationReasons)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count);

        // Member participation
        const playerParticipation: { [key: string]: number } = {};
        completedGames.forEach(game => {
          if (game.game_participants) {
            const confirmed = game.game_participants.filter(p => p.confirmed === true);
            confirmed.forEach(p => {
              if (p.members?.nickname) {
                playerParticipation[p.members.nickname] = (playerParticipation[p.members.nickname] || 0) + 1;
              }
            });
          }
        });

        const memberParticipation = Object.entries(playerParticipation)
          .map(([nickname, gamesPlayed]) => ({
            nickname,
            gamesPlayed,
            participationRate: (gamesPlayed / completed) * 100
          }))
          .sort((a, b) => b.participationRate - a.participationRate);

        setStats({
          total,
          completed,
          cancelled,
          completionRate,
          byField,
          byMonth,
          averageParticipation: averageTotal,
          participationStats: {
            confirmed: averageConfirmed,
            declined: averageDeclined,
            pending: averagePending,
            total: averageTotal
          },
          cancellationReasons: formattedCancellationReasons,
          memberParticipation
        });
      }
    } catch (err) {
      console.error('Error fetching game stats:', err);
      setError('Erro ao carregar estatísticas dos jogos');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerStats = async () => {
    try {
      // Fetch all statistics
      const { data: statistics, error: statsError } = await supabase
        .from('game_statistics')
        .select(`
          statistic_type,
          team,
          game_id,
          member:members!game_statistics_member_id_fkey (
            id,
            nickname,
            photo_url
          )
        `);

      if (statsError) throw statsError;

      // Fetch all game participants to calculate games played
      const { data: participants, error: participantsError } = await supabase
        .from('game_participants')
        .select(`
          member_id,
          team,
          game_id,
          members (
            nickname,
            photo_url
          )
        `)
        .eq('confirmed', true)
        .not('team', 'is', null);

      if (participantsError) throw participantsError;

      if (statistics && participants) {
        // Calculate game results for each team
        const gameResults = new Map<string, { scoreA: number, scoreB: number }>();
        
        // Group statistics by game to calculate scores
        statistics.forEach(stat => {
          if (!gameResults.has(stat.game_id)) {
            gameResults.set(stat.game_id, { scoreA: 0, scoreB: 0 });
          }
          
          const result = gameResults.get(stat.game_id)!;
          
          if (stat.statistic_type === 'goal') {
            if (stat.team === 'A') {
              result.scoreA++;
            } else if (stat.team === 'B') {
              result.scoreB++;
            }
          } else if (stat.statistic_type === 'own_goal') {
            if (stat.team === 'A') {
              result.scoreB++;
            } else if (stat.team === 'B') {
              result.scoreA++;
            }
          }
        });
        
        // Calculate team results (win/loss/draw) for each game
        const teamResults = new Map<string, TeamResult[]>();
        
        gameResults.forEach((scores, gameId) => {
          const resultA: TeamResult = {
            game_id: gameId,
            team: 'A',
            score_a: scores.scoreA,
            score_b: scores.scoreB,
            result: scores.scoreA > scores.scoreB ? 'win' : scores.scoreA < scores.scoreB ? 'loss' : 'draw'
          };
          
          const resultB: TeamResult = {
            game_id: gameId,
            team: 'B',
            score_a: scores.scoreA,
            score_b: scores.scoreB,
            result: scores.scoreB > scores.scoreA ? 'win' : scores.scoreB < scores.scoreA ? 'loss' : 'draw'
          };
          
          if (!teamResults.has(gameId)) {
            teamResults.set(gameId, []);
          }
          
          teamResults.get(gameId)!.push(resultA, resultB);
        });
        
        // Group statistics by player
        const playerStatsMap = new Map<string, PlayerStats>();

        // First, initialize player stats from participants
        participants.forEach(participant => {
          const memberId = participant.member_id;
          const nickname = participant.members.nickname;
          const photoUrl = participant.members.photo_url;
          
          if (!playerStatsMap.has(memberId)) {
            playerStatsMap.set(memberId, {
              nickname,
              photo_url: photoUrl,
              goals: 0,
              own_goals: 0,
              saves: 0,
              assists: 0,
              games_played: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              goal_average: 0,
              points: 0
            });
          }
          
          // Increment games played
          const playerStat = playerStatsMap.get(memberId)!;
          playerStat.games_played++;
          
          // Add win/loss/draw based on game result
          if (teamResults.has(participant.game_id)) {
            const gameResult = teamResults.get(participant.game_id)!.find(r => r.team === participant.team);
            if (gameResult) {
              if (gameResult.result === 'win') {
                playerStat.wins++;
              } else if (gameResult.result === 'loss') {
                playerStat.losses++;
              } else {
                playerStat.draws++;
              }
            }
          }
        });
        
        // Add statistics
        statistics.forEach(stat => {
          const memberId = stat.member.id;
          
          if (!playerStatsMap.has(memberId)) {
            playerStatsMap.set(memberId, {
              nickname: stat.member.nickname,
              photo_url: stat.member.photo_url,
              goals: 0,
              own_goals: 0,
              saves: 0,
              assists: 0,
              games_played: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              goal_average: 0,
              points: 0
            });
          }
          
          const playerStat = playerStatsMap.get(memberId)!;
          
          switch (stat.statistic_type) {
            case 'goal':
              playerStat.goals++;
              break;
            case 'own_goal':
              playerStat.own_goals++;
              break;
            case 'save':
              playerStat.saves++;
              break;
            case 'assist':
              playerStat.assists++;
              break;
          }
        });
        
        // Calculate goal average and points
        playerStatsMap.forEach(player => {
          // Calculate goal average (goals per game)
          player.goal_average = player.games_played > 0 ? player.goals / player.games_played : 0;
          
          // Calculate points (3 for win, 1 for draw, plus goals and assists, and 0.5 for saves, minus own goals)
          player.points = (player .wins * 3) + player.draws + player.goals + (player.assists * 0.5) + (player.saves * 0.5) - (player.own_goals * 1);
        });
        
        // Convert map to array and sort by points
        const playerStatsArray = Array.from(playerStatsMap.values())
          .sort((a, b) => b.points - a.points);
        
        setPlayerStats(playerStatsArray);
      }
    } catch (err) {
      console.error('Error fetching player stats:', err);
      setError('Erro ao carregar estatísticas dos jogadores');
    }
  };

  const handleSort = (field: keyof PlayerStats) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedPlayerStats = () => {
    return [...playerStats].sort((a, b) => {
      const valueA = a[sortField];
      const valueB = b[sortField];
      
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }
      
      // For string values
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }
      
      return 0;
    });
  };

  const getSortIcon = (field: keyof PlayerStats) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' 
      ? <span className="ml-1">↑</span> 
      : <span className="ml-1">↓</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4 mb-8">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Estatísticas dos Jogos</h1>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('games')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'games'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Jogos
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'players'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Jogadores
          </button>
        </div>
      </div>

      {activeTab === 'games' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Jogos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Trophy className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Jogos Realizados</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Jogos Cancelados</p>
                  <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <UserX className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taxa de Realização</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.completionRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Statistics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Games by Field */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-6">
                <Trophy className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold">Jogos por Campo</h2>
                <span className="ml-2 text-sm text-gray-500">(apenas realizados)</span>
              </div>
              <div className="space-y-4">
                {Object.entries(stats.byField).map(([field, count]) => (
                  <div key={field} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{field}</span>
                      <span className="text-gray-600">{count} jogos</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / stats.completed) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Games by Month */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-6">
                <Clock className="w-6 h-6 text-green-600 mr-2" />
                <h2 className="text-lg font-semibold">Jogos por Mês</h2>
                <span className="ml-2 text-sm text-gray-500">(apenas realizados)</span>
              </div>
              <div className="space-y-4">
                {Object.entries(stats.byMonth).map(([month, count]) => (
                  <div key={month} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium capitalize">{month}</span>
                      <span className="text-gray-600">{count} jogos</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(count / stats.completed) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Participation Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-6">
                <Users className="w-6 h-6 text-purple-600 mr-2" />
                <h2 className="text-lg font-semibold">Estatísticas de Participação</h2>
                <span className="ml-2 text-sm text-gray-500">(média por jogo)</span>
              </div>
              <div className="space-y-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-green-700">Confirmados</span>
                    <span className="text-green-700">{Math.round(stats.participationStats.confirmed)} jogadores</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ 
                        width: stats.participationStats.total > 0 
                          ? `${(stats.participationStats.confirmed / stats.participationStats.total) * 100}%` 
                          : '0%'
                      }}
                    />
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-red-700">Recusados</span>
                    <span className="text-red-700">{Math.round(stats.participationStats.declined)} jogadores</span>
                  </div>
                  <div className="w-full bg-red-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ 
                        width: stats.participationStats.total > 0 
                          ? `${(stats.participationStats.declined / stats.participationStats.total) * 100}%` 
                          : '0%'
                      }}
                    />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700">Pendentes</span>
                    <span className="text-gray-700">{Math.round(stats.participationStats.pending)} jogadores</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-600 h-2 rounded-full"
                      style={{ 
                        width: stats.participationStats.total > 0 
                          ? `${(stats.participationStats.pending / stats.participationStats.total) * 100}%` 
                          : '0%'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cancellation Reasons */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-6">
                <UserX className="w-6 h-6 text-red-600 mr-2" />
                <h2 className="text-lg font-semibold">Motivos de Cancelamento</h2>
                <span className="ml-2 text-sm text-gray-500">({stats.cancelled} jogos cancelados)</span>
              </div>
              {stats.cancellationReasons.length > 0 ? (
                <div className="space-y-4">
                  {stats.cancellationReasons.map(({ reason, count }) => (
                    <div key={reason} className="bg-red-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-red-700">{reason}</span>
                        <span className="text-red-700">{count} {count === 1 ? 'jogo' : 'jogos'}</span>
                      </div>
                      <div className="w-full bg-red-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: `${(count / stats.cancelled) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">Nenhum jogo foi cancelado</p>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'players' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Ranking dos Jogadores</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posição
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jogador
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('points')}
                  >
                    <div className="flex items-center justify-center">
                      <Medal className="w-4 h-4 text-yellow-600 mr-1" />
                      <span>Pontos{getSortIcon('points')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('games_played')}
                  >
                    <div className="flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-blue-600 mr-1" />
                      <span>Jogos{getSortIcon('games_played')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('wins')}
                  >
                    <div className="flex items-center justify-center">
                      <Zap className="w-4 h-4 text-green-600 mr-1" />
                      <span>V{getSortIcon('wins')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('draws')}
                  >
                    <div className="flex items-center justify-center">
                      <span>E{getSortIcon('draws')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('losses')}
                  >
                    <div className="flex items-center justify-center">
                      <span>D{getSortIcon('losses')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('goals')}
                  >
                    <div className="flex items-center justify-center">
                      <Goal className="w-4 h-4 text-green-600 mr-1" />
                      <span>Gols{getSortIcon('goals')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('own_goals')}
                  >
                    <div className="flex items-center justify-center">
                      <Goal className="w-4 h-4 text-red-600 mr-1" />
                      <span>G.C.{getSortIcon('own_goals')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('goal_average')}
                  >
                    <div className="flex items-center justify-center">
                      <Percent className="w-4 h-4 text-purple-600 mr-1" />
                      <span>Média{getSortIcon('goal_average')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('assists')}
                  >
                    <div className="flex items-center justify-center">
                      <Award className="w-4 h-4 text-purple-600 mr-1" />
                      <span>Assist.{getSortIcon('assists')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('saves')}
                  >
                    <div className="flex items-center justify-center">
                      <Shield className="w-4 h-4 text-blue-600 mr-1" />
                      <span>Defesas{getSortIcon('saves')}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getSortedPlayerStats().map((player, index) => (
                  <tr key={player.nickname} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold
                          ${index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                            index === 1 ? 'bg-gray-200 text-gray-800' : 
                            index === 2 ? 'bg-orange-100 text-orange-800' : 
                            'bg-gray-100 text-gray-600'}`}>
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={player.nickname}
                            className="h-10 w-10 rounded-full object-cover mr-3"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            <span className="text-gray-500 text-sm">
                              {player.nickname.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{player.nickname}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {player.points.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {player.games_played}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {player.wins}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {player.draws}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        {player.losses}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {player.goals}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        {player.own_goals}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        {player.goal_average.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        {player.assists}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {player.saves}
                      </span>
                    </td>
                  </tr>
                ))}
                {playerStats.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma estatística registrada ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Como os pontos são calculados:</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>3 pontos por vitória</li>
              <li>1 ponto por empate</li>
              <li>1 ponto por gol marcado</li>
              <li>0.5 ponto por assistência</li>
              <li>0.5 ponto por defesa</li>
              <li>-1 ponto por gol contra</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}