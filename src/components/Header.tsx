import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME } from '../config/constants';
import { Menu } from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';
import { supabase } from '../lib/supabase';

interface ClubInfo {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function Header() {
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const [nickname, setNickname] = useState<string>('');
  const [club, setClub] = useState<ClubInfo | null>(null);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        const { data: member, error } = await supabase
          .from('members')
          .select(`
            nickname,
            clubs (
              id,
              name,
              logo_url
            )
          `)
          .eq('user_id', session.user.id)
          .single();

        if (error) throw error;
        if (member) {
          setNickname(member.nickname);
          setClub(member.clubs);
        }
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
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
              {club?.logo_url ? (
                <img
                  src={club.logo_url}
                  alt={club.name || APP_NAME}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-500 text-lg">
                    {APP_NAME.charAt(0)}
                  </span>
                </div>
              )}
              <h1 className="ml-3 text-xl font-bold text-gray-900">
                {club?.name || APP_NAME}
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
          {nickname && (
            <div className="text-gray-600">
              Olá, <span className="font-medium text-green-600">{nickname}</span>, seja bem-vindo!
            </div>
          )}
        </div>
      </div>
    </header>
  );
}