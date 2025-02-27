import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Trophy, Clock, UserCheck, UserX, UserMinus, Gift } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1).toISOString();
      const endDate = new Date(currentYear, 11, 31).toISOString();

      // Fetch all games for basic stats
      const { data: allGames, error: allGamesError } = await supabase
        .from('games')
        .select('*')
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Estatísticas dos Jogos</h1>

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
    </div>
  );
}