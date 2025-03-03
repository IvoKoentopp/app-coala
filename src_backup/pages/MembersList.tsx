import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, findMemberByNickname } from '../lib/supabase';
import { Trash2, Edit, Plus, Phone } from 'lucide-react';
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
}

export default function MembersList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminStatus();
    fetchMembers();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        setCurrentUserId(session.user.id);
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

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      if (data) {
        setMembers(data);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  };

  const searchMember = async (nickname: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await findMemberByNickname(nickname);

      if (error) {
        console.error('Erro ao buscar membro:', error);
        setError('Erro ao buscar membro');
        return null;
      }

      if (!data) {
        setError('Membro não encontrado');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro inesperado:', error);
      setError('Erro ao buscar membro');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (!isAdmin) {
        setError('Apenas administradores podem excluir sócios');
        return;
      }

      if (window.confirm('Tem certeza que deseja excluir este membro?')) {
        const { error } = await supabase
          .from('members')
          .delete()
          .eq('id', id);
        
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

  return (
    <div className="min-h-screen bg-green-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Lista de Sócios</h1>
          {isAdmin && (
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 inline-flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Sócio
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-[8%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Foto
                  </th>
                  <th className="w-[15%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Nasc.
                  </th>
                  <th className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Apelido
                  </th>
                  <th className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Padrinho
                  </th>
                  <th className="w-[8%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="w-[12%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Cadastro
                  </th>
                  <th className="w-[8%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  {(isAdmin || currentUserId) && (
                    <th className="w-[9%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-3 py-4">
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
                    <td className="px-3 py-4">{member.name}</td>
                    <td className="px-3 py-4">{formatDate(member.birth_date)}</td>
                    <td className="px-3 py-4">{member.nickname}</td>
                    <td className="px-3 py-4">{member.category}</td>
                    <td className="px-3 py-4">{member.sponsor_nickname || '-'}</td>
                    <td className="px-3 py-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.status === 'Ativo' ? 'bg-green-100 text-green-800' :
                        member.status === 'Inativo' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-3 py-4">{formatDate(member.start_month)}</td>
                    <td className="px-3 py-4">
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
                      <td className="px-3 py-4 text-sm text-gray-500">
                        <div className="flex space-x-2">
                          {canEditMember(member) && (
                            <button
                              onClick={() => navigate(`/members/edit/${member.id}`)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="text-red-600 hover:text-red-900"
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
      </div>
    </div>
  );
}