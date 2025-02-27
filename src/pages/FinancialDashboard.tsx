import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowUp, ArrowDown, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

interface Account {
  id: string;
  description: string;
  total: number;
}

interface Summary {
  revenues: number;
  expenses: number;
  total: number;
  revenueAccounts: Account[];
  expenseAccounts: Account[];
}

export default function FinancialDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary>({
    revenues: 0,
    expenses: 0,
    total: 0,
    revenueAccounts: [],
    expenseAccounts: []
  });
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    month: 'acumulado'
  });
  const [years, setYears] = useState<string[]>([]);
  const [expandedRevenues, setExpandedRevenues] = useState(false);
  const [expandedExpenses, setExpandedExpenses] = useState(false);

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    if (filters.year) {
      fetchSummary();
    }
  }, [filters]);

  const fetchAvailableYears = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('date');

      if (error) throw error;

      if (data) {
        const uniqueYears = [...new Set(data.map(t => t.date.substring(0, 4)))];
        setYears(uniqueYears.sort().reverse());
      }
    } catch (err) {
      console.error('Error fetching years:', err);
      setError('Erro ao carregar anos disponíveis');
    }
  };

  const getMonthEndDate = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const year = parseInt(filters.year);
      let startDate, endDate;

      if (filters.month === 'acumulado') {
        startDate = `${filters.year}-01-01`;
        endDate = `${filters.year}-12-31`;
      } else {
        const month = parseInt(filters.month);
        const lastDay = getMonthEndDate(year, month);
        startDate = `${filters.year}-${filters.month}-01`;
        endDate = `${filters.year}-${filters.month}-${lastDay}`;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          value,
          account:accounts (
            id,
            description,
            account_group
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      if (data) {
        const accountTotals = data.reduce((acc, transaction) => {
          const accountId = transaction.account.id;
          if (!acc[accountId]) {
            acc[accountId] = {
              id: accountId,
              description: transaction.account.description,
              total: 0,
              account_group: transaction.account.account_group
            };
          }
          acc[accountId].total += transaction.value;
          return acc;
        }, {} as { [key: string]: Account & { account_group: string } });

        const revenueAccounts = Object.values(accountTotals)
          .filter(account => account.account_group === 'Receita')
          .sort((a, b) => b.total - a.total);

        const expenseAccounts = Object.values(accountTotals)
          .filter(account => account.account_group === 'Despesa')
          .sort((a, b) => b.total - a.total);

        const revenues = revenueAccounts.reduce((sum, account) => sum + account.total, 0);
        const expenses = expenseAccounts.reduce((sum, account) => sum + account.total, 0);

        setSummary({
          revenues,
          expenses,
          total: revenues - expenses,
          revenueAccounts,
          expenseAccounts
        });
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
      setError('Erro ao carregar resumo financeiro');
    } finally {
      setLoading(false);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Demonstrativo de Resultado</h1>
        
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              <option value="acumulado">Acumulado</option>
              {Array.from({ length: 12 }, (_, i) => {
                const month = (i + 1).toString().padStart(2, '0');
                return (
                  <option key={month} value={month}>
                    {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="max-w-md mx-auto space-y-6">
        {/* Receitas */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedRevenues(!expandedRevenues)}>
              <div>
                <p className="text-sm font-medium text-gray-600">Receitas</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.revenues)}</p>
              </div>
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full mr-2">
                  <ArrowUp className="w-6 h-6 text-green-600" />
                </div>
                {expandedRevenues ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
          </div>
          {expandedRevenues && summary.revenueAccounts.length > 0 && (
            <div className="border-t border-gray-100 px-6 py-4 bg-green-50">
              <div className="space-y-3">
                {summary.revenueAccounts.map(account => (
                  <div key={account.id} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{account.description}</span>
                    <span className="text-sm font-medium text-green-600">{formatCurrency(account.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Despesas */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedExpenses(!expandedExpenses)}>
              <div>
                <p className="text-sm font-medium text-gray-600">Despesas</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.expenses)}</p>
              </div>
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-full mr-2">
                  <ArrowDown className="w-6 h-6 text-red-600" />
                </div>
                {expandedExpenses ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
          </div>
          {expandedExpenses && summary.expenseAccounts.length > 0 && (
            <div className="border-t border-gray-100 px-6 py-4 bg-red-50">
              <div className="space-y-3">
                {summary.expenseAccounts.map(account => (
                  <div key={account.id} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{account.description}</span>
                    <span className="text-sm font-medium text-red-600">{formatCurrency(account.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resultado */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resultado</p>
              <p className={`text-2xl font-bold ${summary.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.total)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${summary.total >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`w-6 h-6 ${summary.total >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}