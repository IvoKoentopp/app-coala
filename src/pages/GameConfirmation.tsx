import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Logo from '../components/Logo';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function GameConfirmation() {
  const { gameId } = useParams();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [allMembers, setAllMembers] = useState<any[]>([]);

  // Carrega todos os membros para debug
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/members?select=id,nickname`,
          {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );

        const data = await response.json();
        console.log('Todos os membros:', data);
        setAllMembers(data || []);
      } catch (err) {
        console.error('Erro ao carregar membros:', err);
      }
    };

    loadMembers();
  }, []);

  const handleConfirmation = async (willPlay: boolean) => {
    if (!nickname.trim()) {
      setError('Por favor, informe seu apelido');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Verifica se o membro existe
      const memberResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/members?nickname=eq.${encodeURIComponent(nickname.trim())}&select=id`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      const memberData = await memberResponse.json();
      console.log('Resposta do membro:', memberData);
      console.log('Apelido buscado:', nickname.trim());

      if (!memberData || !Array.isArray(memberData) || memberData.length === 0) {
        setError('Apelido não encontrado. Verifique se digitou corretamente.');
        return;
      }

      const member = memberData[0];

      // 2. Verifica se o jogo existe e está agendado
      const gameResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/games?id=eq.${encodeURIComponent(gameId)}&select=status`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      const gameData = await gameResponse.json();
      console.log('Resposta do jogo:', gameData);

      if (!gameData || !Array.isArray(gameData) || gameData.length === 0) {
        setError('Jogo não encontrado');
        return;
      }

      const game = gameData[0];

      if (game.status !== 'Agendado') {
        setError('Este jogo não está mais agendado');
        return;
      }

      // 3. Atualiza ou cria a confirmação
      const confirmResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/game_participants`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            game_id: gameId,
            member_id: member.id,
            confirmed: willPlay
          })
        }
      );

      if (!confirmResponse.ok) {
        throw new Error('Erro ao confirmar presença');
      }

      setSuccess(willPlay ? 'Presença confirmada!' : 'Ausência registrada!');
    } catch (err) {
      console.error('Erro:', err);
      setError('Erro ao processar sua confirmação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <Logo />
      
      <div className="mt-8 w-full max-w-md bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-center mb-6">Confirmação de Presença</h2>

        {success ? (
          <div className="text-center">
            <div className="mb-4 text-green-600 font-medium">{success}</div>
            <p className="text-gray-600">Obrigado por confirmar!</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Seu Apelido
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Digite seu apelido"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <div className="mt-2 text-sm text-gray-600">
                Apelidos disponíveis: {allMembers.map(m => m.nickname).join(', ')}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => handleConfirmation(true)}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Vou Jogar'}
              </button>
              
              <button
                onClick={() => handleConfirmation(false)}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Não Vou Jogar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}