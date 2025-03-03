import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Filter, DollarSign } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, isBefore } from 'date-fns';

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

  const formatDateDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatReferenceMonth = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month] = dateStr.split('-');
    return `${month}/${year}`;
  };

  useEffect(() => {
    checkAdminStatus();
    fetchAccounts();
    fetchInitialBalance();
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (allTransactions.length > 0 && filters.startDate) {
      applyFilters();
    }
  }, [allTransactions, filters, baseInitialBalance]);

  const fetchInitialBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('club_settings')
        .select('value')
        .eq('key', 'initial_balance')
        .single();

      if (error) throw error;
      
      if (data?.value) {
        const initialBalance = parseFloat(data.value);
        setBaseInitialBalance(initialBalance);
        setSummary(prev => ({
          ...prev,
          initialBalance,
          finalBalance: initialBalance
        }));
      }
    } catch (err) {
      console.error('Error fetching initial balance:', err);
      setError('Erro ao carregar saldo inicial');
    }
  };

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
        .order('date', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const earliestDate = data.reduce((earliest, transaction) => {
          return transaction.date < earliest ? transaction.date : earliest;
        }, data[0].date);

        setFilters(prev => ({
          ...prev,
          startDate: earliestDate
        }));

        // Extract unique beneficiaries
        const uniqueBeneficiaries = Array.from(
          new Set(
            data
              .filter(t => t.beneficiary)
              .map(t => t.beneficiary as string)
          )
        ).sort();
        
        setBeneficiaries(uniqueBeneficiaries);
        setAllTransactions(data);
        setTransactions(data);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Erro ao carregar movimentações');
    } finally {
      setLoading(false);
    }
  };

  const calculateDynamicInitialBalance = (startDate: string): number => {
    // If no start date is selected, return the base initial balance
    if (!startDate) return baseInitialBalance;

    // Calculate the balance up to the start date (excluding transactions on the start date)
    const startDateObj = parseISO(startDate);
    
    // Get all transactions before the start date
    const previousTransactions = allTransactions.filter(transaction => {
      const transactionDate = parseISO(transaction.date);
      return isBefore(transactionDate, startDateObj);
    });

    // Calculate the sum of all previous transactions
    const previousBalance = previousTransactions.reduce((sum, transaction) => {
      if (transaction.account.account_group === 'Receita') {
        return sum + transaction.value;
      } else {
        return sum - transaction.value;
      }
    }, 0);

    // Return the base initial balance plus the sum of all previous transactions
    return baseInitialBalance + previousBalance;
  };

  const applyFilters = () => {
    if (!filters.startDate || !filters.endDate) return;

    const filtered = allTransactions.filter(transaction => {
      const transactionDate = startOfDay(parseISO(transaction.date));
      const startDate = startOfDay(parseISO(filters.startDate));
      const endDate = endOfDay(parseISO(filters.endDate));

      const dateMatches = isWithinInterval(transactionDate, { start: startDate, end: endDate });
      const accountMatches = !filters.account || transaction.account_id === filters.account;
      const typeMatches = !filters.type || transaction.account.account_group === filters.type;
      const beneficiaryMatches = !filters.beneficiary || 
        (transaction.beneficiary && transaction.beneficiary === filters.beneficiary);

      return dateMatches && accountMatches && typeMatches && beneficiaryMatches;
    });

    setFilteredTransactions(filtered);

    // Calculate dynamic initial balance based on the start date
    const dynamicInitialBalance = calculateDynamicInitialBalance(filters.startDate);

    const newSummary = filtered.reduce(
      (acc, transaction) => {
        const value = transaction.value;
        if (transaction.account.account_group === 'Receita') {
          acc.revenues += value;
        } else {
          acc.expenses += value;
        }
        return acc;
      },
      { 
        initialBalance: dynamicInitialBalance,
        revenues: 0, 
        expenses: 0,
        finalBalance: 0
      }
    );

    newSummary.finalBalance = newSummary.initialBalance + newSummary.revenues - newSummary.expenses;

    setSummary(newSummary);
  };

  const handleSave = async () => {
    try {
      if (!formData.account_id || !formData.date || !formData.value) {
        setError('Todos os campos são obrigatórios');
        return;
      }

      const value = parseFloat(formData.value);
      if (isNaN(value)) {
        setError('Valor inválido');
        return;
      }

      const transactionData = {
        ...formData,
        value,
        beneficiary: formData.beneficiary || null,
        reference_month: formData.reference_month ? 
          `${formData.reference_month}-01` : 
          null
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id);

        if (error) throw error;
        setSuccess('Movimentação atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert([transactionData]);

        if (error) throw error;
        setSuccess('Movimentação registrada com sucesso!');
      }

      setShowModal(false);
      setFormData({
        account_id: '',
        date: new Date().toISOString().split('T')[0],
        value: '',
        description: '',
        beneficiary: '',
        reference_month: ''
      });
      setEditingTransaction(null);
      await fetchTransactions();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError('Erro ao salvar movimentação');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      account_id: transaction.account_id,
      date: transaction.date,
      value: transaction.value.toString(),
      description: transaction.description || '',
      beneficiary: transaction.beneficiary || '',
      reference_month: transaction.reference_month ? 
        format(new Date(transaction.reference_month), 'yyyy-MM') : 
        ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta movimentação?')) return;

    try {
      const { data: monthlyFee, error: feeError } = await supabase
        .from('monthly_fees')
        .select('id')
        .eq('transaction_id', id)
        .single();

      if (feeError && feeError.code !== 'PGRST116') throw feeError;

      if (monthlyFee) {
        const { error: resetError } = await supabase
          .from('monthly_fees')
          .update({
            payment_date: null,
            transaction_id: null
          })
          .eq('id', monthlyFee.id);

        if (resetError) throw resetError;
      }

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccess('Movimentação excluída com sucesso!');
      await fetchTransactions();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Erro ao excluir a movimentação');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Movimentações</h1>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingTransaction(null);
              setFormData({
                account_id: '',
                date: new Date().toISOString().split('T')[0],
                value: '',
                description: '',
                beneficiary: '',
                reference_month: ''
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Movimentação
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Saldo Inicial</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.initialBalance)}</p>
              {filters.startDate && (
                <p className="text-xs text-gray-500">
                  Em {formatDateDisplay(filters.startDate)}
                </p>
              )}
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Receitas</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(summary.revenues)}</p>
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
              <p className="text-lg font-bold text-red-600">{formatCurrency(summary.expenses)}</p>
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
              <p className={`text-lg font-bold ${summary.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.finalBalance)}
              </p>
              {filters.endDate && (
                <p className="text-xs text-gray-500">
                  Em {formatDateDisplay(filters.endDate)}
                </p>
              )}
            </div>
            <div className={`p-3 rounded-full ${summary.finalBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {summary.finalBalance >= 0 ? (
                <ArrowUp className={`w-6 h-6 ${summary.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              ) : (
                <ArrowDown className={`w-6 h-6 ${summary.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <option value="Receita">Receitas</option>
              <option value="Despesa">Despesas</option>
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

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
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

      {isAdmin && showModal && (
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
                />
              </div>

              {formData.account_id && 
               accounts.find(a => a.id === formData.account_id)?.description.toLowerCase().includes('mensalidade') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mês de Referência</label>
                  <input
                    type="month"
                    value={formData.reference_month}
                    onChange={(e) => setFormData({ ...formData, reference_month: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}

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