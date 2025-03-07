import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Check, X } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  nickname: string;
  is_admin: boolean;
}

export default function AdminPage() {
  const [userClubId, setUserClubId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUserClub();
  }, []);

  useEffect(() => {
    if (userClubId) {
      fetchMembers();
    }
  }, [userClubId]);

  const checkUserClub = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
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
      console.error('Error checking club:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('id, name, nickname, is_admin')
        .eq('club_id', userClubId)
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Erro ao carregar os membros');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToAdmin = async () => {
    if (!selectedMemberId || !userClubId) return;

    try {
      const { error } = await supabase
        .from('members')
        .update({ is_admin: true })
        .eq('id', selectedMemberId)
        .eq('club_id', userClubId);

      if (error) throw error;

      setSuccess('Administrador adicionado com sucesso!');
      setShowAddModal(false);
      setSelectedMemberId(null);
      await fetchMembers();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error promoting member:', err);
      setError('Erro ao promover membro a administrador');
    }
  };

  const handleRemoveAdmin = async (memberId: string) => {
    if (!userClubId) return;

    try {
      const { error } = await supabase
        .from('members')
        .update({ is_admin: false })
        .eq('id', memberId)
        .eq('club_id', userClubId);

      if (error) throw error;

      setSuccess('Administrador removido com sucesso!');
      await fetchMembers();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error removing admin:', err);
      setError('Erro ao remover administrador');
    }
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
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Administradores</h1>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Administrador
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

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Apelido
              </th>
              {isAdmin && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.filter(member => member.is_admin).map((member) => (
              <tr key={member.id}>
                <td className="px-6 py-4 whitespace-nowrap">{member.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{member.nickname}</td>
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleRemoveAdmin(member.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal para adicionar novo administrador */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Novo Administrador</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione o Sócio
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                value={selectedMemberId || ''}
                onChange={(e) => setSelectedMemberId(e.target.value)}
              >
                <option value="">Selecione um sócio</option>
                {members
                  .filter(member => !member.is_admin)
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.nickname})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedMemberId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handlePromoteToAdmin}
                disabled={!selectedMemberId}
                className={`px-4 py-2 rounded-md text-white ${
                  selectedMemberId
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}