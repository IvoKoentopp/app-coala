import { useClub } from '../contexts/ClubContext';
import { SupabaseClient } from '@supabase/supabase-js';

export function useClubQuery() {
  const { club } = useClub();

  const withClubFilter = (query: SupabaseClient['from']) => {
    if (!club?.id) {
      throw new Error('Clube não encontrado');
    }
    return query.eq('club_id', club.id);
  };

  return {
    withClubFilter,
    clubId: club?.id
  };
}
