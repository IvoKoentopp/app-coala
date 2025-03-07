import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Account {
  id: string;
  description: string;
  account_group: 'Receita' | 'Despesa';
  club_id: string;
}

export default function AccountsChart() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<Partial<Account>>({
    description: '',
    account_group: 'Receita'
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (clubId) {
      fetchAccounts();
    }
  }, [clubId]);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        const { data: member, error } = await supabase
          .from('members')
          .select('is_admin, club_id')
          .eq('user_id', session.user.id)
          .single();

        if (error) throw error;
        
        setIsAdmin(member?.is_admin || false);
        if (member?.club_id) {
          setClubId(member.club_id);
        } else {
          throw new Error('Clube não encontrado');
        }
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setError('Erro ao verificar permissões');
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      if (!clubId) {
        throw new Error('Clube não encontrado');
      }

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('club_id', clubId)
        .order('description');

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Erro ao carregar plano de contas');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.description || !clubId) {
        setError('Descrição é obrigatória');
        return;
      }

      if (editingAccount) {
        const { error } = await supabase
          .from('accounts')
          .update({
            description: formData.description,
            account_group: formData.account_group
          })
          .eq('id', editingAccount.id)
          .eq('club_id', clubId);

        if (error) throw error;
        setSuccess('Conta atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('accounts')
          .insert([{
            description: formData.description,
            account_group: formData.account_group,
            club_id: clubId
          }]);

        if (error) throw error;
        setSuccess('Conta criada com sucesso!');
      }

      setShowModal(false);
      setFormData({ description: '', account_group: 'Receita' });
      setEditingAccount(null);
      await fetchAccounts();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving account:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao salvar conta');
      }
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      description: account.description,
      account_group: account.account_group
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta?')) return;
    if (!clubId) return;

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('club_id', clubId);

      if (error) throw error;

      setSuccess('Conta excluída com sucesso!');
      await fetchAccounts();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting account:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao excluir conta');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center text-gray-600 mt-8">
        Apenas administradores podem acessar o plano de contas.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Plano de Contas</h1>
        <button
          onClick={() => {
            setEditingAccount(null);
            setFormData({ description: '', account_group: 'Receita' });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Conta
        </button>
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

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grupo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{account.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      account.account_group === 'Receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {account.account_group}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(account)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {editingAccount ? 'Editar Conta' : 'Nova Conta'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Grupo</label>
                <select
                  value={formData.account_group}
                  onChange={(e) => setFormData({ ...formData, account_group: e.target.value as 'Receita' | 'Despesa' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Receita">Receita</option>
                  <option value="Despesa">Despesa</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingAccount(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}