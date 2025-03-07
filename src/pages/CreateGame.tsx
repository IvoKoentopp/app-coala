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
  const [loading, setLoading] = useState(false);
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
      if (!session?.user.id) {
        navigate('/login');
        return;
      }

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('category, is_admin, club_id')
        .eq('user_id', session.user.id)
        .single();

      if (memberError) {
        console.error('Error fetching member:', memberError);
        setError('Erro ao verificar permissões');
        return;
      }
      
      if (!member) {
        setError('Usuário não encontrado');
        return;
      }

      const isUserAdmin = member.category === 'Contribuinte' || member.is_admin;
      setIsAdmin(isUserAdmin);
      
      if (!isUserAdmin) {
        setError('Você não tem permissão para criar jogos');
        return;
      }

      if (member.club_id) {
        setClubId(member.club_id);
      } else {
        setError('Clube não encontrado');
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setError('Erro ao verificar permissões');
    }
  };

  const validateForm = () => {
    const gameDate = new Date(newGame.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (gameDate < today) {
      setError('A data do jogo não pode ser no passado');
      return false;
    }

    if (!newGame.field) {
      setError('O campo é obrigatório');
      return false;
    }

    return true;
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      if (!clubId) {
        throw new Error('ID do clube não encontrado');
      }

      // 1. Create the game with status 'Agendado' to match RLS policy
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          date: newGame.date,
          field: newGame.field,
          club_id: clubId,
          status: 'Agendado'
        })
        .select('id, club_id')
        .single();

      if (gameError) {
        console.error('Error creating game:', gameError);
        throw new Error('Erro ao criar o jogo. Verifique suas permissões.');
      }
      
      if (!game) {
        throw new Error('Nenhum dado do jogo retornado');
      }

      console.log('Game created:', game);

      // 2. Get all active members from the same club
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id')
        .eq('club_id', game.club_id)
        .eq('status', 'Ativo');

      if (membersError) {
        console.error('Error fetching members:', membersError);
        throw new Error('Erro ao buscar membros do clube');
      }

      if (!members || members.length === 0) {
        throw new Error('Nenhum membro ativo encontrado no clube');
      }

      console.log('Members found:', members.length);

      // 3. Create all game participants at once
      const participantsToInsert = members.map(member => ({
        game_id: game.id,
        member_id: member.id,
        confirmed: null, // null representa "Não Informou"
        created_at: new Date().toISOString()
      }));

      console.log('Inserting participants:', participantsToInsert);

      const { data: participants, error: participationError } = await supabase
        .from('game_participants')
        .insert(participantsToInsert)
        .select();

      if (participationError) {
        console.error('Error creating participants:', participationError);
        throw new Error('Erro ao adicionar participantes ao jogo');
      }

      console.log('Participants created:', participants);

      // 4. Navigate to games list
      navigate('/games');
    } catch (err) {
      console.error('Error in game creation:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao criar o jogo. Por favor, tente novamente.');
      }
    } finally {
      setLoading(false);
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
          disabled={loading}
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
            disabled={loading}
            min={format(new Date(), 'yyyy-MM-dd')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Campo</label>
          <select
            value={newGame.field}
            onChange={(e) => setNewGame({ ...newGame, field: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            disabled={loading}
            required
          >
            <option>Campo Principal</option>
            <option>Campo de Chuva</option>
          </select>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Criando...
              </>
            ) : (
              'Criar Jogo'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}