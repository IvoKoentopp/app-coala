import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Trophy, Clock, UserCheck, UserMinus, UserPlus, Gift } from 'lucide-react';
import { format, differenceInYears, parse, isBefore, isAfter, startOfMonth, getMonth, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MemberStats {
  total: number;
  active: number;
  inactive: number;
  byCategory: {
    Colaborador: number;
    Contribuinte: number;
    Convidado: number;
  };
  ageGroups: {
    [key: string]: number;
  };
  averageAge: number;
  membershipTime: {
    [key: string]: number;
  };
  averageMembershipYears: number;
  topSponsors: {
    nickname: string;
    count: number;
    sponsored: string[];
  }[];
  membershipTimeDetails?: MembershipTimeGroup[];
  ageGroupDetails?: AgeGroup[];
}

interface MembershipTimeGroup {
  range: string;
  count: number;
  members: {
    nickname: string;
    time: string;
  }[];
}

interface Birthday {
  id: string;
  name: string;
  nickname: string;
  birth_date: string;
  photo_url: string | null;
  birthdayDate: Date;
  age: number;
}

interface BirthdaysByMonth {
  [key: string]: Birthday[];
}

interface AgeGroup {
  range: string;
  count: number;
  members: {
    nickname: string;
    age: number;
  }[];
}

export default function RegistrationDashboard() {
  const [stats, setStats] = useState<MemberStats>({
    total: 0,
    active: 0,
    inactive: 0,
    byCategory: {
      Colaborador: 0,
      Contribuinte: 0,
      Convidado: 0
    },
    ageGroups: {},
    averageAge: 0,
    membershipTime: {},
    averageMembershipYears: 0,
    topSponsors: []
  });
  const [birthdaysByMonth, setBirthdaysByMonth] = useState<BirthdaysByMonth>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredSponsor, setHoveredSponsor] = useState<string | null>(null);
  const [hoveredTimeGroup, setHoveredTimeGroup] = useState<string | null>(null);
  const [hoveredAgeGroup, setHoveredAgeGroup] = useState<string | null>(null);
  const [userClubId, setUserClubId] = useState<string | null>(null);

  useEffect(() => {
    checkUserClub();
  }, []);

  useEffect(() => {
    if (userClubId) {
      fetchStats();
      fetchBirthdays();

      // Atualizar a lista de aniversariantes no primeiro dia de cada mês
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      
      if (tomorrow.getDate() === 1) {
        const timeUntilMidnight = tomorrow.getTime() - now.getTime();
        setTimeout(() => {
          fetchBirthdays();
        }, timeUntilMidnight);
      }
    }
  }, [userClubId]);

  const checkUserClub = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        const { data: member } = await supabase
          .from('members')
          .select('club_id')
          .eq('user_id', session.user.id)
          .single();

        if (member) {
          setUserClubId(member.club_id);
        }
      }
    } catch (err) {
      console.error('Error checking club:', err);
      setError('Erro ao verificar clube');
    }
  };

  const fetchBirthdays = async () => {
    if (!userClubId) return;

    try {
      const { data: members, error } = await supabase
        .from('members')
        .select('id, name, nickname, birth_date, photo_url')
        .eq('status', 'Ativo')
        .eq('club_id', userClubId);

      if (error) throw error;

      if (members) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = getMonth(currentDate);

        // Mapear todos os aniversariantes com suas datas para o ano atual
        const allBirthdays = members.map(member => {
          const birthDate = parse(member.birth_date, 'yyyy-MM-dd', new Date());
          const birthMonth = getMonth(birthDate);
          const birthDay = getDate(birthDate);
          
          // Definir a data do aniversário para o ano atual
          const birthdayThisYear = new Date(currentYear, birthMonth, birthDay);
          
          return {
            ...member,
            birthdayDate: birthdayThisYear,
            age: differenceInYears(birthdayThisYear, new Date(member.birth_date))
          };
        });

        // Filtrar apenas os aniversários dos meses que ainda não passaram
        const upcomingBirthdays = allBirthdays.filter(birthday => {
          const birthMonth = getMonth(birthday.birthdayDate);
          return birthMonth >= currentMonth;
        });

        // Ordenar por data
        upcomingBirthdays.sort((a, b) => {
          const monthA = getMonth(a.birthdayDate);
          const monthB = getMonth(b.birthdayDate);
          if (monthA === monthB) {
            return getDate(a.birthdayDate) - getDate(b.birthdayDate);
          }
          return monthA - monthB;
        });

        // Agrupar por mês
        const groupedByMonth = upcomingBirthdays.reduce((acc: BirthdaysByMonth, birthday) => {
          const monthKey = format(birthday.birthdayDate, 'MMMM', { locale: ptBR });
          if (!acc[monthKey]) {
            acc[monthKey] = [];
          }
          acc[monthKey].push(birthday);
          return acc;
        }, {});

        setBirthdaysByMonth(groupedByMonth);
      }
    } catch (err) {
      console.error('Error fetching birthdays:', err);
      setError('Erro ao carregar aniversariantes');
    }
  };

  const getMembershipTimeGroup = (years: number): string => {
    if (years >= 40) return '40+ anos';
    if (years >= 30) return '30-40 anos';
    if (years >= 20) return '20-30 anos';
    if (years >= 10) return '10-20 anos';
    if (years >= 5) return '5-10 anos';
    if (years >= 1) return '1-5 anos';
    return 'Menos de 1 ano';
  };

  const getMembershipTimeOrder = (group: string): number => {
    const orderMap: { [key: string]: number } = {
      '40+ anos': 7,
      '30-40 anos': 6,
      '20-30 anos': 5,
      '10-20 anos': 4,
      '5-10 anos': 3,
      '1-5 anos': 2,
      'Menos de 1 ano': 1
    };
    return orderMap[group] || 0;
  };

  const getAgeGroup = (age: number): string => {
    if (age >= 60) return '60+ anos';
    if (age >= 50) return '50-60 anos';
    if (age >= 40) return '40-50 anos';
    if (age >= 30) return '30-40 anos';
    if (age >= 20) return '20-30 anos';
    return 'Até 20 anos';
  };

  const getAgeGroupOrder = (group: string): number => {
    const orderMap: { [key: string]: number } = {
      '60+ anos': 6,
      '50-60 anos': 5,
      '40-50 anos': 4,
      '30-40 anos': 3,
      '20-30 anos': 2,
      'Até 20 anos': 1
    };
    return orderMap[group] || 0;
  };

  const fetchStats = async () => {
    if (!userClubId) return;

    try {
      setLoading(true);
      const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .eq('club_id', userClubId);

      if (error) throw error;

      if (members) {
        // Basic stats
        const total = members.length;
        const active = members.filter(m => m.status === 'Ativo').length;
        const inactive = total - active;

        // Category distribution
        const byCategory = members.reduce((acc, member) => {
          acc[member.category as keyof typeof acc] = (acc[member.category as keyof typeof acc] || 0) + 1;
          return acc;
        }, {
          Colaborador: 0,
          Contribuinte: 0,
          Convidado: 0
        });

        // Calculate ages and age groups with member details
        let totalAge = 0;
        const ageGroupsMap: { [key: string]: { count: number; members: { nickname: string; age: number }[] } } = {};
        
        members.forEach(member => {
          if (member.birth_date) {
            const age = differenceInYears(new Date(), new Date(member.birth_date));
            totalAge += age;
            const group = getAgeGroup(age);
            
            if (!ageGroupsMap[group]) {
              ageGroupsMap[group] = { count: 0, members: [] };
            }
            
            ageGroupsMap[group].count++;
            ageGroupsMap[group].members.push({
              nickname: member.nickname,
              age
            });
          }
        });

        // Sort members within each group by age
        Object.values(ageGroupsMap).forEach(group => {
          group.members.sort((a, b) => b.age - a.age);
        });

        // Convert to sorted array
        const ageGroups = Object.entries(ageGroupsMap)
          .map(([range, data]) => ({
            range,
            count: data.count,
            members: data.members
          }))
          .sort((a, b) => getAgeGroupOrder(b.range) - getAgeGroupOrder(a.range));

        // Calculate average age
        const averageAge = members.length > 0 ? totalAge / members.length : 0;

        // Calculate membership time with member details
        const membershipTimeGroups: { [key: string]: { count: number; members: { nickname: string; time: string }[] } } = {};
        const now = new Date();
        let totalMembershipYears = 0;

        members.forEach(member => {
          const startDate = new Date(member.start_month);
          const years = differenceInYears(now, startDate);
          totalMembershipYears += years;
          const group = getMembershipTimeGroup(years);
          
          if (!membershipTimeGroups[group]) {
            membershipTimeGroups[group] = { count: 0, members: [] };
          }
          
          membershipTimeGroups[group].count++;
          membershipTimeGroups[group].members.push({
            nickname: member.nickname,
            time: `${years} ${years === 1 ? 'ano' : 'anos'}`
          });
        });

        // Sort members within each group by time
        Object.values(membershipTimeGroups).forEach(group => {
          group.members.sort((a, b) => {
            const yearsA = parseInt(a.time);
            const yearsB = parseInt(b.time);
            return yearsB - yearsA;
          });
        });

        // Convert to sorted array
        const membershipTime = Object.entries(membershipTimeGroups)
          .map(([range, data]) => ({
            range,
            count: data.count,
            members: data.members
          }))
          .sort((a, b) => getMembershipTimeOrder(b.range) - getMembershipTimeOrder(a.range));

        // Calculate average membership time
        const averageMembershipYears = members.length > 0 ? totalMembershipYears / members.length : 0;

        // Get top sponsors with their sponsored members
        const sponsorMap = new Map<string, string[]>();
        members.forEach(member => {
          if (member.sponsor_nickname) {
            if (!sponsorMap.has(member.sponsor_nickname)) {
              sponsorMap.set(member.sponsor_nickname, []);
            }
            sponsorMap.get(member.sponsor_nickname)?.push(member.nickname);
          }
        });

        const topSponsors = Array.from(sponsorMap.entries())
          .map(([nickname, sponsored]) => ({
            nickname,
            count: sponsored.length,
            sponsored: sponsored.sort()
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setStats({
          total,
          active,
          inactive,
          byCategory,
          ageGroups: ageGroups.reduce((acc, group) => {
            acc[group.range] = group.count;
            return acc;
          }, {} as { [key: string]: number }),
          averageAge,
          membershipTime: membershipTime.reduce((acc, group) => {
            acc[group.range] = group.count;
            return acc;
          }, {} as { [key: string]: number }),
          averageMembershipYears,
          topSponsors,
          membershipTimeDetails: membershipTime,
          ageGroupDetails: ageGroups
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  if (!userClubId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Clube não encontrado</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Estatísticas de Cadastro</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Summary Cards - Keep 4 columns for quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Members */}
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

        {/* Active Members */}
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

        {/* Inactive Members */}
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

        {/* Activity Rate */}
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

      {/* Main Statistics Grid - 2 columns for detailed stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Category Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Distribuição por Categoria</h2>
            <div className="space-y-4">
              {Object.entries(stats.byCategory).map(([category, count]) => (
                <div key={category} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600">{category}</p>
                  <div className="mt-2 flex items-end justify-between">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-500">
                      {((count / stats.total) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Age Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Users className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold">Distribuição por Idade</h2>
            </div>
            <div className="space-y-4">
              {stats.ageGroupDetails?.map((group) => (
                <div 
                  key={group.range} 
                  className="bg-gray-50 rounded-lg p-3"
                  onMouseEnter={() => setHoveredAgeGroup(group.range)}
                  onMouseLeave={() => setHoveredAgeGroup(null)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{group.range}</span>
                    <span className="text-sm text-gray-500">{group.count} sócios</span>
                  </div>
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(group.count / Object.values(stats.ageGroups).reduce((a, b) => a + b, 0)) * 100}%` }}
                      />
                    </div>
                    {hoveredAgeGroup === group.range && group.members.length > 0 && (
                      <div className="absolute left-0 top-full mt-2 p-3 bg-white rounded-lg shadow-lg z-10 w-64">
                        <p className="text-sm font-semibold mb-2">Sócios nesta faixa:</p>
                        <div className="max-h-48 overflow-y-auto">
                          <ul className="text-sm text-gray-600 space-y-1">
                            {group.members.map((member, idx) => (
                              <li key={idx} className="flex justify-between">
                                <span>{member.nickname}</span>
                                <span className="text-gray-500">{member.age} anos</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* Average Age */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Idade Média</span>
                  <span className="text-sm text-blue-600 font-semibold">
                    {Math.round(stats.averageAge)} anos
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Membership Time */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Clock className="w-6 h-6 text-green-600 mr-2" />
              <h2 className="text-lg font-semibold">Tempo de Associação</h2>
            </div>
            <div className="space-y-4">
              {stats.membershipTimeDetails?.map((group) => (
                <div 
                  key={group.range} 
                  className="bg-gray-50 rounded-lg p-3"
                  onMouseEnter={() => setHoveredTimeGroup(group.range)}
                  onMouseLeave={() => setHoveredTimeGroup(null)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{group.range}</span>
                    <span className="text-sm text-gray-500">{group.count} sócios</span>
                  </div>
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(group.count / Object.values(stats.membershipTime).reduce((a, b) => a + b, 0)) * 100}%` }}
                      />
                    </div>
                    {hoveredTimeGroup === group.range && group.members.length > 0 && (
                      <div className="absolute left-0 top-full mt-2 p-3 bg-white rounded-lg shadow-lg z-10 w-64">
                        <p className="text-sm font-semibold mb-2">Sócios nesta faixa:</p>
                        <div className="max-h-48 overflow-y-auto">
                          <ul className="text-sm text-gray-600 space-y-1">
                            {group.members.map((member, idx) => (
                              <li key={idx} className="flex justify-between">
                                <span>{member.nickname}</span>
                                <span className="text-gray-500">{member.time}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* Average Membership Time */}
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Tempo Médio</span>
                  <span className="text-sm text-green-600 font-semibold">
                    {Math.round(stats.averageMembershipYears)} anos
                  </span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Top Sponsors with Tooltip */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Trophy className="w-6 h-6 text-yellow-600 mr-2" />
              <h2 className="text-lg font-semibold">Top Padrinhos</h2>
            </div>
            <div className="space-y-4">
              {stats.topSponsors.map((sponsor, index) => (
                <div key={sponsor.nickname} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center relative">
                    <span className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 flex items-center justify-center text-sm font-bold">
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
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Birthday List - Full Width */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <Gift className="w-6 h-6 text-pink-600 mr-2" />
          <h2 className="text-lg font-semibold">Próximos Aniversariantes</h2>
        </div>
        
        {Object.keys(birthdaysByMonth).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(birthdaysByMonth).map(([month, monthBirthdays]) => (
              <div key={month} className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 capitalize border-b pb-2">
                  {month}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {monthBirthdays.map((birthday) => (
                    <div key={birthday.id} className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4">
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
                          {format(birthday.birthdayDate, 'dd/MM')} - {birthday.age} anos
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">Nenhum aniversariante próximo</p>
        )}
      </div>
    </div>
  );
}