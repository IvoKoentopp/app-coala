import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface Member {
  id: string;
  name: string;
  nickname: string;
}

interface MonthlyFee {
  id: string;
  member_id: string;
  reference_month: string;
  due_date: string;
  value: number;
  payment_date: string | null;
  transaction_id: string | null;
  member: Member;
}

interface Account {
  id: string;
  description: string;
}

export default function MonthlyFees() {
  const [monthlyFees, setMonthlyFees] = useState<MonthlyFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<MonthlyFee | null>(null);
  const [mensalidadeAccount, setMensalidadeAccount] = useState<Account | null>(null);
  const [generateForm, setGenerateForm] = useState({
    reference_month: format(new Date(), 'yyyy-MM'),
    due_date: format(new Date(), 'yyyy-MM-dd'),
    value: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    payment_date: format(new Date(), 'yyyy-MM-dd')
  });
  const [editForm, setEditForm] = useState({
    due_date: '',
    value: ''
  });

  useEffect(() => {
    checkAdminStatus();
    fetchMonthlyFees();
    fetchMensalidadeAccount();
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

  const fetchMensalidadeAccount = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, description')
        .ilike('description', '%mensalidade%')
        .single();

      if (error) throw error;
      setMensalidadeAccount(data);
    } catch (err) {
      console.error('Error fetching mensalidade account:', err);
      setError('Erro ao carregar conta de mensalidade. Crie uma conta com "mensalidade" no nome.');
    }
  };

  const fetchMonthlyFees = async () => {
    try {
      const { data, error } = await supabase
        .from('monthly_fees')
        .select(`
          *,
          member:members (
            id,
            name,
            nickname
          )
        `)
        .order('reference_month', { ascending: false });

      if (error) throw error;
      setMonthlyFees(data || []);
    } catch (err) {
      console.error('Error fetching monthly fees:', err);
      setError('Erro ao carregar mensalidades');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFees = async () => {
    try {
      if (!generateForm.reference_month || !generateForm.due_date || !generateForm.value) {
        setError('Todos os campos são obrigatórios');
        return;
      }

      const value = parseFloat(generateForm.value);
      if (isNaN(value)) {
        setError('Valor inválido');
        return;
      }

      // Get all active contributing members
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id')
        .eq('status', 'Ativo')
        .eq('category', 'Contribuinte');

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        setError('Nenhum sócio contribuinte ativo encontrado');
        return;
      }

      // Generate fees for each member
      const fees = members.map(member => ({
        member_id: member.id,
        reference_month: generateForm.reference_month + '-01', // Add day for proper date format
        due_date: generateForm.due_date,
        value
      }));

      const { error: insertError } = await supabase
        .from('monthly_fees')
        .insert(fees);

      if (insertError) throw insertError;

      setSuccess('Mensalidades geradas com sucesso!');
      setShowGenerateModal(false);
      setGenerateForm({
        reference_month: format(new Date(), 'yyyy-MM'),
        due_date: format(new Date(), 'yyyy-MM-dd'),
        value: ''
      });
      await fetchMonthlyFees();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error generating fees:', err);
      setError('Erro ao gerar mensalidades');
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedFee || !mensalidadeAccount) return;

    try {
      // First create the transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          account_id: mensalidadeAccount.id,
          date: paymentForm.payment_date,
          value: selectedFee.value,
          beneficiary: selectedFee.member.nickname,
          reference_month: selectedFee.reference_month,
          description: `Mensalidade ${selectedFee.reference_month.substring(5, 7)}/${selectedFee.reference_month.substring(0, 4)}`
        }])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Then update the monthly fee with payment info
      const { error: updateError } = await supabase
        .from('monthly_fees')
        .update({
          payment_date: paymentForm.payment_date,
          transaction_id: transaction.id
        })
        .eq('id', selectedFee.id);

      if (updateError) throw updateError;

      setSuccess('Pagamento confirmado com sucesso!');
      setShowPaymentModal(false);
      setSelectedFee(null);
      setPaymentForm({
        payment_date: format(new Date(), 'yyyy-MM-dd')
      });
      await fetchMonthlyFees();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error confirming payment:', err);
      setError('Erro ao confirmar pagamento');
    }
  };

  const handleEdit = (fee: MonthlyFee) => {
    setSelectedFee(fee);
    setEditForm({
      due_date: fee.due_date,
      value: fee.value.toString()
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedFee) return;

    try {
      const value = parseFloat(editForm.value);
      if (isNaN(value)) {
        setError('Valor inválido');
        return;
      }

      const { error } = await supabase
        .from('monthly_fees')
        .update({
          due_date: editForm.due_date,
          value
        })
        .eq('id', selectedFee.id);

      if (error) throw error;

      // If there's a linked transaction, update it too
      if (selectedFee.transaction_id) {
        const { error: transactionError } = await supabase
          .from('transactions')
          .update({ value })
          .eq('id', selectedFee.transaction_id);

        if (transactionError) throw transactionError;
      }

      setSuccess('Mensalidade atualizada com sucesso!');
      setShowEditModal(false);
      setSelectedFee(null);
      await fetchMonthlyFees();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating monthly fee:', err);
      setError('Erro ao atualizar mensalidade');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta mensalidade?')) return;

    try {
      const { error } = await supabase
        .from('monthly_fees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccess('Mensalidade excluída com sucesso!');
      await fetchMonthlyFees();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting monthly fee:', err);
      setError('Erro ao excluir mensalidade');
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

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mensalidades</h1>
        {isAdmin && (
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Gerar Mensalidades
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

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sócio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referência
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimento
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {monthlyFees.map((fee) => (
                <tr key={fee.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {fee.member.nickname}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatReferenceMonth(fee.reference_month)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDateDisplay(fee.due_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {formatCurrency(fee.value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {fee.payment_date ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Pago em {formatDateDisplay(fee.payment_date)}
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pendente
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {!fee.payment_date && (
                          <>
                            <button
                              onClick={() => handleEdit(fee)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Editar"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedFee(fee);
                                setShowPaymentModal(true);
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="Confirmar Pagamento"
                            >
                              <DollarSign className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(fee.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
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

      {/* Modals - only render if isAdmin is true */}
      {isAdmin && (
        <>
          {/* Generate Fees Modal */}
          {showGenerateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Gerar Mensalidades</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mês de Referência</label>
                    <input
                      type="month"
                      value={generateForm.reference_month}
                      onChange={(e) => setGenerateForm({ ...generateForm, reference_month: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data de Vencimento</label>
                    <input
                      type="date"
                      value={generateForm.due_date}
                      onChange={(e) => setGenerateForm({ ...generateForm, due_date: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Valor</label>
                    <input
                      type="text"
                      value={generateForm.value}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                        setGenerateForm({ ...generateForm, value });
                      }}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGenerateFees}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Gerar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Modal */}
          {showPaymentModal && selectedFee && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Confirmar Pagamento</h2>
                
                <div className="mb-6 space-y-2">
                  <p className="text-gray-600">
                    <span className="font-medium">Sócio:</span> {selectedFee.member.nickname}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Referência:</span> {formatReferenceMonth(selectedFee.reference_month)}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Valor:</span> {formatCurrency(selectedFee.value)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data do Pagamento</label>
                    <input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedFee(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {showEditModal && selectedFee && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Editar Mensalidade</h2>
                
                <div className="mb-6 space-y-2">
                  <p className="text-gray-600">
                    <span className="font-medium">Sócio:</span> {selectedFee.member.nickname}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Referência:</span> {formatReferenceMonth(selectedFee.reference_month)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data de Vencimento</label>
                    <input
                      type="date"
                      value={editForm.due_date}
                      onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Valor</label>
                    <input
                      type="text"
                      value={editForm.value}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                        setEditForm({ ...editForm, value });
                      }}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedFee(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}