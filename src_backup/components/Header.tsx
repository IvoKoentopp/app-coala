import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FALLBACK_LOGO_URL, APP_NAME } from '../config/constants';
import { useClubSettings } from '../hooks/useClubSettings';
import { Menu } from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';

interface Member {
  nickname: string;
}

export default function Header() {
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const { settings } = useClubSettings();
  const logoUrl = settings.club_logo || FALLBACK_LOGO_URL;
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    fetchMember();
  }, []);

  const fetchMember = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        const { data, error } = await supabase
          .from('members')
          .select('nickname')
          .eq('user_id', session.user.id)
          .single();

        if (error) throw error;
        if (data) {
          setMember(data);
        }
      }
    } catch (err) {
      console.error('Error fetching member:', err);
    }
  };

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div 
              className="flex items-center cursor-pointer" 
              onClick={() => navigate('/')}
            >
              <img
                src={logoUrl}
                alt={APP_NAME}
                className="h-10 w-10"
              />
              <h1 className="ml-3 text-xl font-bold text-gray-900">
                {APP_NAME}
              </h1>
            </div>
            <button
              onClick={toggleSidebar}
              className="ml-4 p-2 rounded-md text-green-600 hover:text-green-700 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 flex items-center"
            >
              <Menu className="h-6 w-6" />
              <span className="ml-1 text-sm font-medium">Menu</span>
            </button>
          </div>
          {member && (
            <div className="text-gray-600">
              Olá, <span className="font-medium text-green-600">{member.nickname}</span>, seja bem-vindo!
            </div>
          )}
        </div>
      </div>
    </header>
  );
}