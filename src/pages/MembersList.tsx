import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Trash2, Edit, Plus, Phone, User, Calendar, Tag, Users, Award, CheckCircle } from 'lucide-react';
import { formatDate } from '../lib/date';

interface Member {
  id: string;
  user_id: string;
  name: string;
  nickname: string;
  birth_date: string;
  category: string;
  sponsor_nickname: string | null;
  start_month: string;
  payment_start_month: string | null;
  status: string;
  photo_url: string | null;
  phone: string | null;
  is_admin: boolean;
  club_id: string;
}

export default function MembersList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [userClubId, setUserClubId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndClub();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (userClubId) {
      fetchMembers();
    }
  }, [userClubId]);

  const checkAdminAndClub = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        setCurrentUserId(session.user.id);
        const { data: member } = await supabase
          .from('members')
          .select('is_admin, club_id')
          .eq('user_id', session.user.id)
          .single();

        if (member) {
          setIsAdmin(member.is_admin || false);
          setUserClubId(member.club_id);
        }
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setError('Erro ao verificar permissões');
    }
  };

  const fetchMembers = async () => {
    if (!userClubId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('club_id', userClubId)
        .order('name');
      
      if (error) throw error;
      if (data) {
        setMembers(data);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Erro ao carregar a lista de sócios');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!userClubId) return;

    try {
      if (!isAdmin) {
        setError('Apenas administradores podem excluir sócios');
        return;
      }

      if (window.confirm('Tem certeza que deseja excluir este membro?')) {
        const { error } = await supabase
          .from('members')
          .delete()
          .eq('id', id)
          .eq('club_id', userClubId);
        
        if (error) throw error;
        
        setMembers(members.filter(member => member.id !== id));
      }
    } catch (err) {
      console.error('Error deleting member:', err);
      setError('Erro ao excluir o sócio');
    }
  };

  const canEditMember = (member: Member) => {
    return isAdmin || member.user_id === currentUserId;
  };

  const handleViewProfile = (member: Member) => {
    navigate(`/members/edit/${member.id}?view=true`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!userClubId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Clube não encontrado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 py-8 px-4">
      <div className="max-w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Lista de Sócios</h1>
          {isAdmin && (
            <button
              onClick={() => navigate('/register')}
              className="px-3 py-1 md:px-4 md:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 inline-flex items-center text-sm md:text-base"
            >
              <Plus className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Novo Sócio</span>
              <span className="sm:hidden">Novo</span>
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Mobile Card View */}
        {isMobile && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {members.map((member) => (
              <div 
                key={member.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden"
                onClick={() => handleViewProfile(member)}
              >
                <div className="p-4">
                  <div className="flex items-center mb-4">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={member.name}
                        className="h-14 w-14 rounded-full object-cover mr-3"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                        <span className="text-gray-500 text-lg">
                          {member.nickname.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-600">{member.nickname}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                      <span>{formatDate(member.birth_date) || 'Não informado'}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Tag className="w-4 h-4 text-gray-500 mr-2" />
                      <span>{member.category}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-gray-500 mr-2" />
                      <span>{member.sponsor_nickname || 'Sem padrinho'}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-gray-500 mr-2" />
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.status === 'Ativo' ? 'bg-green-100 text-green-800' :
                        member.status === 'Inativo' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {member.status}
                      </span>
                    </div>
                    
                    {member.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-gray-500 mr-2" />
                        <a
                          href={`tel:${member.phone}`}
                          className="text-green-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {member.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {(isAdmin || currentUserId) && (
                    <div className="mt-4 flex justify-end space-x-2">
                      {canEditMember(member) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/members/edit/${member.id}`);
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(member.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Desktop Table View */}
        {!isMobile && (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Foto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Nascimento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Apelido
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Padrinho
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cadastro
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contato
                    </th>
                    {(isAdmin || currentUserId) && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div 
                          onClick={() => handleViewProfile(member)}
                          className="cursor-pointer transition-transform hover:scale-105"
                        >
                          {member.photo_url ? (
                            <img
                              src={member.photo_url}
                              alt={member.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 text-sm">
                                {member.nickname.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">{member.name}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{formatDate(member.birth_date) || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{member.nickname}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{member.category}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{member.sponsor_nickname || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.status === 'Ativo' ? 'bg-green-100 text-green-800' :
                          member.status === 'Inativo' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">{formatDate(member.start_month)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {member.phone ? (
                          <a
                            href={`tel:${member.phone}`}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            {member.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400">Não informado</span>
                        )}
                      </td>
                      {(isAdmin || currentUserId) && (
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          <div className="flex justify-end space-x-2">
                            {canEditMember(member) && (
                              <button
                                onClick={() => navigate(`/members/edit/${member.id}`)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Editar"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(member.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Excluir"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}