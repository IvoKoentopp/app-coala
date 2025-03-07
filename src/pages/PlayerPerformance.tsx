import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Trophy, Medal, Goal, Shield, Award, Percent, Zap, 
  ArrowLeft, BarChart, Filter, RefreshCw, ShieldCheck, ShieldX,
  Calendar
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

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

interface TeamStats {
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  totalGames: number;
}

export default function PlayerPerformance() {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof PlayerStats>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterNickname, setFilterNickname] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [teamStats, setTeamStats] = useState<{
    teamA: TeamStats;
    teamB: TeamStats;
  }>({
    teamA: { wins: 0, draws: 0, losses: 0, goalsScored: 0, goalsConceded: 0, totalGames: 0 },
    teamB: { wins: 0, draws: 0, losses: 0, goalsScored: 0, goalsConceded: 0, totalGames: 0 }
  });
  const [dateFilters, setDateFilters] = useState({
    startDate: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchPlayerStats();
  }, [dateFilters]);

  const fetchPlayerStats = async () => {
    try {
      setLoading(true);
      setError(null);
      if (isRefreshing) setIsRefreshing(true);

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
        `)
        .gte('created_at', dateFilters.startDate)
        .lte('created_at', dateFilters.endDate);

      if (statsError) throw statsError;

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
        .not('team', 'is', null)
        .gte('created_at', dateFilters.startDate)
        .lte('created_at', dateFilters.endDate);

      if (participantsError) throw participantsError;

      if (statistics && participants) {
        const gameResults = new Map<string, { scoreA: number, scoreB: number }>();
        
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
        
        const teamResults = new Map<string, TeamResult[]>();
        
        const teamAStats: TeamStats = { wins: 0, draws: 0, losses: 0, goalsScored: 0, goalsConceded: 0, totalGames: 0 };
        const teamBStats: TeamStats = { wins: 0, draws: 0, losses: 0, goalsScored: 0, goalsConceded: 0, totalGames: 0 };
        
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
          
          teamAStats.totalGames++;
          teamBStats.totalGames++;
          
          teamAStats.goalsScored += scores.scoreA;
          teamAStats.goalsConceded += scores.scoreB;
          teamBStats.goalsScored += scores.scoreB;
          teamBStats.goalsConceded += scores.scoreA;
          
          if (scores.scoreA > scores.scoreB) {
            teamAStats.wins++;
            teamBStats.losses++;
          } else if (scores.scoreA < scores.scoreB) {
            teamAStats.losses++;
            teamBStats.wins++;
          } else {
            teamAStats.draws++;
            teamBStats.draws++;
          }
        });
        
        setTeamStats({
          teamA: teamAStats,
          teamB: teamBStats
        });
        
        const playerStatsMap = new Map<string, PlayerStats>();

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
          
          const playerStat = playerStatsMap.get(memberId)!;
          playerStat.games_played++;
          
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
        
        playerStatsMap.forEach(player => {
          player.goal_average = player.games_played > 0 ? player.goals / player.games_played : 0;
          player.points = (player.wins * 3) + player.draws + player.goals + (player.assists * 0.5) + (player.saves * 0.5) - (player.own_goals * 1);
        });
        
        const playerStatsArray = Array.from(playerStatsMap.values())
          .sort((a, b) => b.points - a.points);
        
        setPlayerStats(playerStatsArray);
      }
    } catch (err) {
      console.error('Error fetching player stats:', err);
      setError('Erro ao carregar estatísticas dos jogadores');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSort = (field: keyof PlayerStats) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedPlayerStats = () => {
    return [...playerStats]
      .filter(player => 
        filterNickname === '' || 
        player.nickname.toLowerCase().includes(filterNickname.toLowerCase())
      )
      .sort((a, b) => {
        const valueA = a[sortField];
        const valueB = b[sortField];
        
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        
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

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPlayerStats();
  };

  const calculateWinRate = (wins: number, totalGames: number) => {
    if (totalGames === 0) return 0;
    return (wins / totalGames) * 100;
  };

  if (loading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Performance dos Jogadores</h1>
        <button
          onClick={handleRefresh}
          className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center ${isRefreshing ? 'opacity-75 cursor-not-allowed' : ''}`}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center mb-4">
          <Calendar className="w-5 h-5 text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold">Período</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Data Inicial</label>
            <input
              type="date"
              value={dateFilters.startDate}
              onChange={(e) => setDateFilters({ ...dateFilters, startDate: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data Final</label>
            <input
              type="date"
              value={dateFilters.endDate}
              onChange={(e) => setDateFilters({ ...dateFilters, endDate: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-300">
          <div className="flex items-center mb-4">
            <ShieldCheck className="w-6 h-6 text-gray-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">Time Branco</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Jogos</p>
              <p className="text-2xl font-bold text-gray-800">{teamStats.teamA.totalGames}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Vitórias</p>
              <p className="text-2xl font-bold text-green-600">{teamStats.teamA.wins}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Empates</p>
              <p className="text-2xl font-bold text-gray-600">{teamStats.teamA.draws}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Derrotas</p>
              <p className="text-2xl font-bold text-red-600">{teamStats.teamA.losses}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-center">
              <p className="text-sm text-gray-500">Gols Marcados</p>
              <p className="text-lg font-semibold text-green-600">{teamStats.teamA.goalsScored}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Gols Sofridos</p>
              <p className="text-lg font-semibold text-red-600">{teamStats.teamA.goalsConceded}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Aproveitamento</p>
              <p className="text-lg font-semibold text-blue-600">
                {calculateWinRate(teamStats.teamA.wins, teamStats.teamA.totalGames).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center mb-4">
            <ShieldX className="w-6 h-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold text-green-800">Time Verde</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Jogos</p>
              <p className="text-2xl font-bold text-gray-800">{teamStats.teamB.totalGames}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Vitórias</p>
              <p className="text-2xl font-bold text-green-600">{teamStats.teamB.wins}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Empates</p>
              <p className="text-2xl font-bold text-gray-600">{teamStats.teamB.draws}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Derrotas</p>
              <p className="text-2xl font-bold text-red-600">{teamStats.teamB.losses}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-center">
              <p className="text-sm text-gray-500">Gols Marcados</p>
              <p className="text-lg font-semibold text-green-600">{teamStats.teamB.goalsScored}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Gols Sofridos</p>
              <p className="text-lg font-semibold text-red-600">{teamStats.teamB.goalsConceded}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Aproveitamento</p>
              <p className="text-lg font-semibold text-blue-600">
                {calculateWinRate(teamStats.teamB.wins, teamStats.teamB.totalGames).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center">
          <Filter className="w-5 h-5 text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold">Filtros</h2>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por nome</label>
          <input
            type="text"
            value={filterNickname}
            onChange={(e) => setFilterNickname(e.target.value)}
            placeholder="Digite o nome do jogador..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

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
    </div>
  );
}