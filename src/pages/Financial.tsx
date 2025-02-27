import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, DollarSign, PlusCircle, MinusCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface Account {
  id: string;
  description: string;
  account_group: 'Receita' | 'Despesa';
}

interface Transaction {
  id: string;
  account_id: string;
  date: string;
  value: number;
  description: string;
  beneficiary: string | null;
  reference_month: string | null;
  account: Account;
}

interface DREGroup {
  account_group: 'Receita' | 'Despesa';
  total: number;
  accounts: {
    id: string;
    description: string;
    total: number;
  }[];
}

export default function Financial() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newAccount, setNewAccount] = useState<Partial<Account>>({
    description: '',
    account_group: 'Receita'
  });
  const [newTransaction, setNewTransaction] = useState({
    account_id: '',
    date: new Date().toISOString().split('T')[0],
    value: '',
    description: '',
    beneficiary: '',
    reference_month: ''
  });
  const [dreData, setDREData] = useState<{
    receitas: DREGroup;
    despesas: DREGroup;
    resultado: number;
  }>({
    receitas: { account_group: 'Receita', total: 0, accounts: [] },
    despesas: { account_group: 'Despesa', total: 0, accounts: [] },
    resultado: 0
  });

  useEffect(() => {
    checkAdminStatus();
    fetchAccounts();
    fetchTransactions();
  }, []);

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

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('description');

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Erro ao carregar plano de contas');
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          account:accounts (
            id,
            description,
            account_group
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);

      // Calculate DRE
      const dreGroups = (data || []).reduce((acc: { [key: string]: DREGroup }, transaction) => {
        const group = transaction.account.account_group;
        const accountId = transaction.account.id;
        const value = transaction.value;

        if (!acc[group]) {
          acc[group] = { account_group: group, total: 0, accounts: [] };
        }

        acc[group].total += value;

        const accountIndex = acc[group].accounts.findIndex(a => a.id === accountId);
        if (accountIndex === -1) {
          acc[group].accounts.push({
            id: accountId,
            description: transaction.account.description,
            total: value
          });
        } else {
          acc[group].accounts[accountIndex].total += value;
        }

        return acc;
      }, {});

      const receitasTotal = dreGroups['Receita']?.total || 0;
      const despesasTotal = dreGroups['Despesa']?.total || 0;

      setDREData({
        receitas: dreGroups['Receita'] || { account_group: 'Receita', total: 0, accounts: [] },
        despesas: dreGroups['Despesa'] || { account_group: 'Despesa', total: 0, accounts: [] },
        resultado: receitasTotal - despesasTotal
      });
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Erro ao carregar movimentações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    try {
      if (!newAccount.description) {
        setError('Descrição é obrigatória');
        return;
      }

      const { error } = await supabase
        .from('accounts')
        .insert([{
          description: newAccount.description,
          account_group: newAccount.account_group
        }]);

      if (error) throw error;

      setSuccess('Conta criada com sucesso!');
      setShowAccountModal(false);
      setNewAccount({ description: '', account_group: 'Receita' });
      await fetchAccounts();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving account:', err);
      setError('Erro ao salvar conta');
    }
  };

  const handleSaveTransaction = async () => {
    try {
      if (!newTransaction.account_id || !newTransaction.date || !newTransaction.value) {
        setError('Todos os campos são obrigatórios');
        return;
      }

      const value = parseFloat(newTransaction.value);
      if (isNaN(value)) {
        setError('Valor inválido');
        return;
      }

      // Verificar se é uma conta de mensalidade
      const selectedAccount = accounts.find(a => a.id === newTransaction.account_id);
      const isMensalidade = selectedAccount?.description.toLowerCase().includes('mensalidade');

      if (isMensalidade && !newTransaction.reference_month) {
        setError('Mês de referência é obrigatório para mensalidades');
        return;
      }

      const { error } = await supabase
        .from('transactions')
        .insert([{
          ...newTransaction,
          value,
          beneficiary: newTransaction.beneficiary || null,
          reference_month: newTransaction.reference_month || null
        }]);

      if (error) throw error;

      setSuccess('Movimentação registrada com sucesso!');
      setShowTransactionModal(false);
      setNewTransaction({
        account_id: '',
        date: new Date().toISOString().split('T')[0],
        value: '',
        description: '',
        beneficiary: '',
        reference_month: ''
      });
      await fetchTransactions();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError('Erro ao salvar movimentação');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      if (!window.confirm('Tem certeza que deseja excluir esta conta?')) return;

      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccess('Conta excluída com sucesso!');
      await fetchAccounts();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Erro ao excluir conta');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatReferenceMonth = (date: string) => {
    return format(new Date(date), 'MM/yyyy');
  };

  if (!isAdmin) {
    return (
      <div className="text-center text-gray-600 mt-8">
        Apenas administradores podem acessar o módulo financeiro.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
        <div className="space-x-4">
          <button
            onClick={() => setShowAccountModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Conta
          </button>
          <button
            onClick={() => setShowTransactionModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <DollarSign className="w-5 h-5 mr-2" />
            Nova Movimentação
          </button>
        </div>
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

      {/* DRE */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Demonstrativo de Resultado do Exercício (DRE)
        </h2>

        {/* Receitas */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <PlusCircle className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-green-800">
              Receitas ({formatCurrency(dreData.receitas.total)})
            </h3>
          </div>
          <div className="space-y-2">
            {dreData.receitas.accounts.map(account => (
              <div key={account.id} className="flex justify-between items-center bg-green-50 p-3 rounded-lg">
                <span className="text-green-700">{account.description}</span>
                <span className="font-medium text-green-800">{formatCurrency(account.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Despesas */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <MinusCircle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">
              Despesas ({formatCurrency(dreData.despesas.total)})
            </h3>
          </div>
          <div className="space-y-2">
            {dreData.despesas.accounts.map(account => (
              <div key={account.id} className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                <span className="text-red-700">{account.description}</span>
                <span className="font-medium text-red-800">{formatCurrency(account.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resultado */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center">
              <ArrowRight className="w-5 h-5 text-gray-600 mr-2" />
              <span className="text-lg font-semibold">Resultado</span>
            </div>
            <span className={`text-xl font-bold ${dreData.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(dreData.resultado)}
            </span>
          </div>
        </div>
      </div>

      {/* Plano de Contas */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Plano de Contas</h2>
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
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Conta */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Nova Conta</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <input
                  type="text"
                  value={newAccount.description}
                  onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Grupo</label>
                <select
                  value={newAccount.account_group}
                  onChange={(e) => setNewAccount({ ...newAccount, account_group: e.target.value as 'Receita' | 'Despesa' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Receita">Receita</option>
                  <option value="Despesa">Despesa</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAccount}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Movimentação */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Nova Movimentação</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Conta</label>
                <select
                  value={newTransaction.account_id}
                  onChange={(e) => setNewTransaction({ ...newTransaction, account_id: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Selecione uma conta</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.description} ({account.account_group})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Data</label>
                <input
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Valor</label>
                <input
                  type="text"
                  value={newTransaction.value}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                    setNewTransaction({ ...newTransaction, value });
                  }}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Favorecido</label>
                <input
                  type="text"
                  value={newTransaction.beneficiary}
                  onChange={(e) => setNewTransaction({ ...newTransaction, beneficiary: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Nome do favorecido"
                />
              </div>
              {newTransaction.account_id && 
               accounts.find(a => a.id === newTransaction.account_id)?.description.toLowerCase().includes('mensalidade') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mês de Referência</label>
                  <input
                    type="month"
                    value={newTransaction.reference_month}
                    onChange={(e) => setNewTransaction({ ...newTransaction, reference_month: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <input
                  type="text"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowTransactionModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTransaction}
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