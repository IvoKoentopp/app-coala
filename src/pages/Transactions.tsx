import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Filter, DollarSign, ChevronUp, ChevronDown } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, isBefore } from 'date-fns';

interface Account {
  id: string;
  description: string;
  account_group: 'Receita' | 'Despesa';
  club_id: string;
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
  club_id: string;
}

interface Summary {
  initialBalance: number;
  revenues: number;
  expenses: number;
  finalBalance: number;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc');
  const [summary, setSummary] = useState<Summary>({
    initialBalance: 0,
    revenues: 0,
    expenses: 0,
    finalBalance: 0
  });
  const [baseInitialBalance, setBaseInitialBalance] = useState<number>(0);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: format(new Date(), 'yyyy-MM-dd'),
    account: '',
    type: '',
    beneficiary: ''
  });
  const [formData, setFormData] = useState({
    account_id: '',
    date: new Date().toISOString().split('T')[0],
    value: '',
    description: '',
    beneficiary: '',
    reference_month: ''
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (clubId) {
      fetchAccounts();
      fetchInitialBalance();
      fetchTransactions();
    }
  }, [clubId]);

  useEffect(() => {
    if (allTransactions.length > 0 && filters.startDate) {
      applyFilters();
    }
  }, [allTransactions, filters, baseInitialBalance]);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        const { data: member } = await supabase
          .from('members')
          .select('is_admin, club_id')
          .eq('user_id', session.user.id)
          .single();
        
        setIsAdmin(member?.is_admin || false);
        if (member?.club_id) {
          setClubId(member.club_id);
        }
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  const fetchAccounts = async () => {
    try {
      if (!clubId) return;

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
    }
  };

  const fetchInitialBalance = async () => {
    try {
      if (!clubId) return;

      const { data, error } = await supabase
        .from('club_settings')
        .select('value')
        .eq('key', 'initial_balance')
        .eq('club_id', clubId)
        .single();

      if (error) throw error;
      setBaseInitialBalance(parseFloat(data?.value || '0'));
    } catch (err) {
      console.error('Error fetching initial balance:', err);
      setError('Erro ao carregar saldo inicial');
    }
  };

  const fetchTransactions = async () => {
    try {
      if (!clubId) return;

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
        .eq('club_id', clubId)
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        setAllTransactions(data);
        setFilteredTransactions(data);

        // Extract unique beneficiaries
        const uniqueBeneficiaries = Array.from(
          new Set(data.map(t => t.beneficiary).filter(Boolean))
        ).sort();
        setBeneficiaries(uniqueBeneficiaries);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Erro ao carregar movimentações');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allTransactions];

    // Apply date filter
    if (filters.startDate && filters.endDate) {
      filtered = filtered.filter(transaction => {
        const transactionDate = startOfDay(parseISO(transaction.date));
        const startDate = startOfDay(parseISO(filters.startDate));
        const endDate = endOfDay(parseISO(filters.endDate));
        return isWithinInterval(transactionDate, { start: startDate, end: endDate });
      });
    }

    // Apply account filter
    if (filters.account) {
      filtered = filtered.filter(t => t.account_id === filters.account);
    }

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(t => t.account.account_group === filters.type);
    }

    // Apply beneficiary filter
    if (filters.beneficiary) {
      filtered = filtered.filter(t => t.beneficiary === filters.beneficiary);
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateSort === 'asc' ? dateA - dateB : dateB - dateA;
    });

    setFilteredTransactions(filtered);

    // Calculate summary
    const summary = filtered.reduce((acc, transaction) => {
      if (transaction.account.account_group === 'Receita') {
        acc.revenues += transaction.value;
      } else {
        acc.expenses += transaction.value;
      }
      return acc;
    }, {
      initialBalance: baseInitialBalance,
      revenues: 0,
      expenses: 0,
      finalBalance: 0
    });

    summary.finalBalance = summary.initialBalance + summary.revenues - summary.expenses;
    setSummary(summary);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      account_id: transaction.account_id,
      date: transaction.date,
      value: transaction.value.toString(),
      description: transaction.description || '',
      beneficiary: transaction.beneficiary || '',
      reference_month: transaction.reference_month || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta movimentação?')) return;
    if (!clubId) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('club_id', clubId);

      if (error) throw error;

      setSuccess('Movimentação excluída com sucesso!');
      await fetchTransactions();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Erro ao excluir movimentação');
    }
  };

  const handleSave = async () => {
    try {
      if (!clubId) {
        throw new Error('ID do clube não encontrado');
      }

      const value = parseFloat(formData.value.replace(',', '.'));
      if (isNaN(value)) {
        setError('Valor inválido');
        return;
      }

      const transactionData = {
        account_id: formData.account_id,
        date: formData.date,
        value,
        description: formData.description || null,
        beneficiary: formData.beneficiary || null,
        reference_month: formData.reference_month || null,
        club_id: clubId
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id)
          .eq('club_id', clubId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert([transactionData]);

        if (error) throw error;
      }

      setSuccess(editingTransaction ? 'Movimentação atualizada com sucesso!' : 'Movimentação registrada com sucesso!');
      setShowModal(false);
      setEditingTransaction(null);
      setFormData({
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDateDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatReferenceMonth = (dateStr: string) => {
    const [year, month] = dateStr.split('-');
    return `${month}/${year}`;
  };

  const toggleDateSort = () => {
    setDateSort(dateSort === 'asc' ? 'desc' : 'asc');
    setFilteredTransactions(prev => [...prev].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateSort === 'asc' ? dateB - dateA : dateA - dateB;
    }));
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
        Apenas administradores podem acessar o módulo financeiro.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Movimentações</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Movimentação
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Saldo Inicial</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.initialBalance)}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <DollarSign className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Receitas</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.revenues)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ArrowUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Despesas</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.expenses)}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <ArrowDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Saldo Final</p>
              <p className={`text-2xl font-bold ${summary.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.finalBalance)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${summary.finalBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`w-6 h-6 ${summary.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Data Inicial</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Data Final</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Conta</label>
            <select
              value={filters.account}
              onChange={(e) => setFilters({ ...filters, account: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todas</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos</option>
              <option value="Receita">Receita</option>
              <option value="Despesa">Despesa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Favorecido</label>
            <select
              value={filters.beneficiary}
              onChange={(e) => setFilters({ ...filters, beneficiary: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos</option>
              {beneficiaries.map((beneficiary) => (
                <option key={beneficiary} value={beneficiary}>
                  {beneficiary}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={toggleDateSort}
                >
                  <div className="flex items-center">
                    Data
                    {dateSort === 'asc' ? 
                      <ChevronUp className="w-4 h-4 ml-1" /> : 
                      <ChevronDown className="w-4 h-4 ml-1" />
                    }
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Favorecido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDateDisplay(transaction.date)}
                    {transaction.reference_month && (
                      <div className="text-xs text-gray-500">
                        Ref: {formatReferenceMonth(transaction.reference_month)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      {transaction.account.description}
                      <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.account.account_group === 'Receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.account.account_group}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.beneficiary || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={transaction.account.account_group === 'Receita' ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(transaction.value)}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {editingTransaction ? 'Editar Movimentação' : 'Nova Movimentação'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Conta</label>
                <select
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
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
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Valor</label>
                <input
                  type="text"
                  value={formData.value}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                    setFormData({ ...formData, value });
                  }}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Favorecido</label>
                <input
                  type="text"
                  value={formData.beneficiary}
                  onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Nome do favorecido"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Mês de Referência</label>
                <input
                  type="month"
                  value={formData.reference_month}
                  onChange={(e) => setFormData({ ...formData, reference_month: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTransaction(null);
                  setFormData({
                    account_id: '',
                    date: new Date().toISOString().split('T')[0],
                    value: '',
                    description: '',
                    beneficiary: '',
                    reference_month: ''
                  });
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