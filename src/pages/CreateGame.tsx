import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Calendar, ArrowLeft } from 'lucide-react';

export default function CreateGame() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [newGame, setNewGame] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    field: 'Campo Principal'
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        const { data: member } = await supabase
          .from('members')
          .select('category, is_admin, club_id')
          .eq('user_id', session.user.id)
          .single();
        
        setIsAdmin(member?.category === 'Contribuinte' || member?.is_admin);
        if (member?.club_id) {
          setClubId(member.club_id);
        }
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setError('Erro ao verificar permissões');
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!clubId) {
        throw new Error('ID do clube não encontrado');
      }

      // 1. Create the game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert([{
          ...newGame,
          club_id: clubId,
          status: 'Agendado'
        }])
        .select()
        .single();

      if (gameError) throw gameError;
      if (!game) throw new Error('No game data returned');

      // 2. Get all active members from the same club
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id')
        .eq('status', 'Ativo')
        .eq('club_id', clubId);

      if (membersError) throw membersError;
      if (!members) throw new Error('No members found');

      // 3. Create game participants with initial "Não Informou" status
      const participations = members.map(member => ({
        game_id: game.id,
        member_id: member.id,
        confirmed: null // null represents "Não Informou"
      }));

      const { error: participationsError } = await supabase
        .from('game_participants')
        .insert(participations);

      if (participationsError) throw participationsError;

      // 4. Navigate to games list
      navigate('/games');
    } catch (err) {
      console.error('Error creating game:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao criar o jogo. Por favor, tente novamente.');
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center text-gray-600 mt-8">
        Apenas administradores podem criar jogos.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/games')}
          className="mr-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Calendar className="w-6 h-6 mr-2" />
          Criar Novo Jogo
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleCreateGame} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Data</label>
          <input
            type="date"
            value={newGame.date}
            onChange={(e) => setNewGame({ ...newGame, date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Campo</label>
          <select
            value={newGame.field}
            onChange={(e) => setNewGame({ ...newGame, field: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          >
            <option>Campo Principal</option>
            <option>Campo de Chuva</option>
          </select>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            Criar Jogo
          </button>
        </div>
      </form>
    </div>
  );
}