import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserCheck, UserPlus, UserMinus, Heart, Gift, Trophy, AlertTriangle } from 'lucide-react';
import { format, parse, differenceInYears, getMonth, getDate, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MemberStats {
  total: number;
  byCategory: {
    Colaborador: number;
    Contribuinte: number;
    Convidado: number;
  };
  active: number;
  inactive: number;
}

interface SponsorStats {
  nickname: string;
  count: number;
  sponsored: string[];
}

interface TopPlayer {
  nickname: string;
  gamesPlayed: number;
  participationRate: number;
  score: number;
  membershipTime: number;
  age: number;
}

interface Birthday {
  id: string;
  name: string;
  nickname: string;
  birth_date: string;
  photo_url: string | null;
  age: number;
}

interface OverdueFee {
  member_nickname: string;
  reference_month: string;
  due_date: string;
  value: number;
  days_overdue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<MemberStats>({
    total: 0,
    byCategory: {
      Colaborador: 0,
      Contribuinte: 0,
      Convidado: 0
    },
    active: 0,
    inactive: 0
  });
  const [sponsorStats, setSponsorStats] = useState<SponsorStats[]>([]);
  const [currentMonthBirthdays, setCurrentMonthBirthdays] = useState<Birthday[]>([]);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [overdueFees, setOverdueFees] = useState<OverdueFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredSponsor, setHoveredSponsor] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchSponsorStats();
    fetchTopPlayers();
    fetchCurrentMonthBirthdays();
    fetchOverdueFees();
  }, []);

  const fetchOverdueFees = async () => {
    try {
      const { data, error } = await supabase
        .from('monthly_fees')
        .select(`
          due_date,
          reference_month,
          value,
          member:members (
            nickname
          )
        `)
        .is('payment_date', null)
        .lte('due_date', new Date().toISOString().split('T')[0])
        .order('due_date');

      if (error) throw error;

      if (data) {
        const today = new Date();
        const overdue = data.map(fee => ({
          member_nickname: fee.member.nickname,
          reference_month: fee.reference_month,
          due_date: fee.due_date,
          value: fee.value,
          days_overdue: differenceInDays(today, new Date(fee.due_date))
        })).sort((a, b) => b.days_overdue - a.days_overdue);

        setOverdueFees(overdue);
      }
    } catch (err) {
      console.error('Error fetching overdue fees:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: members, error } = await supabase
        .from('members')
        .select('category, status');

      if (error) throw error;

      const stats: MemberStats = {
        total: members.length,
        byCategory: {
          Colaborador: 0,
          Contribuinte: 0,
          Convidado: 0
        },
        active: 0,
        inactive: 0
      };

      members.forEach(member => {
        // Count by category
        stats.byCategory[member.category as keyof typeof stats.byCategory]++;
        
        // Count by status
        if (member.status === 'Ativo') {
          stats.active++;
        } else {
          stats.inactive++;
        }
      });

      setStats(stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentMonthBirthdays = async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const { data: members, error } = await supabase
        .from('members')
        .select('id, name, nickname, birth_date, photo_url')
        .eq('status', 'Ativo');

      if (error) throw error;

      if (members) {
        const birthdays = members
          .map(member => {
            const birthDate = parse(member.birth_date, 'yyyy-MM-dd', new Date());
            const birthMonth = birthDate.getMonth() + 1;
            const age = differenceInYears(
              new Date(currentYear, birthMonth - 1, getDate(birthDate)),
              birthDate
            );

            return {
              ...member,
              age
            };
          })
          .filter(member => {
            const birthDate = parse(member.birth_date, 'yyyy-MM-dd', new Date());
            return getMonth(birthDate) + 1 === currentMonth;
          })
          .sort((a, b) => {
            const dateA = parse(a.birth_date, 'yyyy-MM-dd', new Date());
            const dateB = parse(b.birth_date, 'yyyy-MM-dd', new Date());
            return getDate(dateA) - getDate(dateB);
          });

        setCurrentMonthBirthdays(birthdays);
      }
    } catch (err) {
      console.error('Error fetching birthdays:', err);
    }
  };

  const fetchSponsorStats = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('nickname, sponsor_nickname')
        .not('sponsor_nickname', 'is', null)
        .order('sponsor_nickname');

      if (error) throw error;

      const sponsorData: { [key: string]: string[] } = {};
      data.forEach(member => {
        if (member.sponsor_nickname) {
          if (!sponsorData[member.sponsor_nickname]) {
            sponsorData[member.sponsor_nickname] = [];
          }
          sponsorData[member.sponsor_nickname].push(member.nickname);
        }
      });

      const sortedStats = Object.entries(sponsorData)
        .map(([nickname, sponsored]) => ({
          nickname,
          count: sponsored.length,
          sponsored
        }))
        .sort((a, b) => b.count - a.count);

      setSponsorStats(sortedStats);
    } catch (err) {
      console.error('Error fetching sponsor stats:', err);
    }
  };

  const fetchTopPlayers = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1).toISOString();
      const endDate = new Date(currentYear, 11, 31).toISOString();

      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*, game_participants(*, members(nickname, birth_date, start_month))')
        .eq('status', 'Realizado')
        .gte('date', startDate)
        .lte('date', endDate);

      if (gamesError) throw gamesError;

      if (games) {
        const playerStats: { [key: string]: any } = {};
        const totalGames = games.length;

        games.forEach(game => {
          if (game.game_participants) {
            const confirmed = game.game_participants.filter(p => p.confirmed === true);
            confirmed.forEach(p => {
              if (p.members?.nickname) {
                if (!playerStats[p.members.nickname]) {
                  playerStats[p.members.nickname] = {
                    gamesPlayed: 0,
                    birth_date: p.members.birth_date,
                    start_month: p.members.start_month
                  };
                }
                playerStats[p.members.nickname].gamesPlayed++;
              }
            });
          }
        });

        const now = new Date();
        const topPlayers = Object.entries(playerStats)
          .map(([nickname, data]) => {
            const participationRate = (data.gamesPlayed / totalGames) * 100;
            const birthDate = new Date(data.birth_date);
            const startDate = new Date(data.start_month);
            const age = differenceInYears(now, birthDate);
            const membershipTime = differenceInDays(now, startDate);

            const score = (participationRate * 100000 + membershipTime * 10 + age) / 1000;

            return {
              nickname,
              gamesPlayed: data.gamesPlayed,
              participationRate,
              score,
              membershipTime,
              age
            };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        setTopPlayers(topPlayers);
      }
    } catch (err) {
      console.error('Error fetching top players:', err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatReferenceMonth = (dateStr: string) => {
    const [year, month] = dateStr.split('-');
    return `${month}/${year}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Sócios</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sócios Ativos</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sócios Inativos</p>
              <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <UserMinus className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Atividade</p>
              <p className="text-2xl font-bold text-purple-600">
                {((stats.active / stats.total) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <UserPlus className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mr-2" />
            <h2 className="text-lg font-semibold">Mensalidades em Atraso</h2>
          </div>
          {overdueFees.length > 0 ? (
            <div className="space-y-4">
              {overdueFees.map((fee, index) => (
                <div key={index} className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{fee.member_nickname}</p>
                      <p className="text-sm text-gray-600">
                        Ref: {formatReferenceMonth(fee.reference_month)} • 
                        Venc: {formatDateDisplay(fee.due_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-yellow-800">{formatCurrency(fee.value)}</p>
                      <p className="text-sm text-yellow-600">
                        {fee.days_overdue} {fee.days_overdue === 1 ? 'dia' : 'dias'} em atraso
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">
              Não há mensalidades em atraso
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <Heart className="w-6 h-6 text-pink-600 mr-2" />
            <h2 className="text-lg font-semibold">Top Padrinhos</h2>
          </div>
          <div className="space-y-4">
            {sponsorStats.map((sponsor, index) => (
              <div key={sponsor.nickname} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center relative">
                    <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-800 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span
                      className="ml-2 font-medium cursor-help"
                      onMouseEnter={() => setHoveredSponsor(sponsor.nickname)}
                      onMouseLeave={() => setHoveredSponsor(null)}
                    >
                      {sponsor.nickname}
                      {hoveredSponsor === sponsor.nickname && (
                        <div className="absolute left-0 top-full mt-2 p-3 bg-white rounded-lg shadow-lg z-10 w-48">
                          <p className="text-sm font-semibold mb-2">Afilhados:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {sponsor.sponsored.map(nickname => (
                              <li key={nickname}>{nickname}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{sponsor.count} afilhados</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <Trophy className="w-6 h-6 text-yellow-600 mr-2" />
            <h2 className="text-lg font-semibold">Top Jogadores</h2>
          </div>
          <div className="space-y-4">
            {topPlayers.map((player, index) => (
              <div key={player.nickname} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">{player.nickname}</p>
                      <div className="text-sm text-gray-500">
                        <p>{player.gamesPlayed} jogos ({player.participationRate.toFixed(1)}%)</p>
                        <p className="text-xs">
                          {player.membershipTime} dias de clube • {player.age} anos
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-700">#{index + 1}</div>
                    <div className="text-xs text-gray-500">{player.score.toFixed(1)} pts</div>
                  </div>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-500' :
                      'bg-orange-500'
                    }`}
                    style={{ width: `${(player.score / topPlayers[0].score) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <Gift className="w-6 h-6 text-pink-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              Aniversariantes de {format(new Date(), 'MMMM', { locale: ptBR })}
            </h2>
          </div>
          
          {currentMonthBirthdays.length > 0 ? (
            <div className="space-y-4">
              {currentMonthBirthdays.map((birthday) => (
                <div key={birthday.id} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                  {birthday.photo_url ? (
                    <img
                      src={birthday.photo_url}
                      alt={birthday.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-lg">
                        {birthday.nickname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{birthday.nickname}</p>
                    <p className="text-sm text-gray-500">
                      Dia {format(parse(birthday.birth_date, 'yyyy-MM-dd', new Date()), 'dd')} - {birthday.age} anos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">
              Nenhum aniversariante este mês
            </p>
          )}
        </div>
      </div>
    </div>
  );
}