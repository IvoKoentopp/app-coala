import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Club {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ClubContextType {
  club: Club | null;
  loading: boolean;
}

const ClubContext = createContext<ClubContextType>({} as ClubContextType);

export const useClub = () => useContext(ClubContext);

export const ClubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClub();
  }, []);

  const fetchClub = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        const { data: member, error } = await supabase
          .from('members')
          .select(`
            club:clubs (
              id,
              name,
              logo_url
            )
          `)
          .eq('user_id', session.user.id)
          .single();

        if (error) throw error;
        if (member?.club) {
          setClub(member.club);
        }
      }
    } catch (err) {
      console.error('Error fetching club:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClubContext.Provider value={{ club, loading }}>
      {children}
    </ClubContext.Provider>
  );
};
