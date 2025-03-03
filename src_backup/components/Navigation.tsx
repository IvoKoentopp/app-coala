import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/')}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                isActive('/') 
                  ? 'text-green-700 bg-green-50' 
                  : 'text-gray-700 hover:text-green-700 hover:bg-green-50'
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              Sócios
            </button>
            <button
              onClick={() => navigate('/games')}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                isActive('/games')
                  ? 'text-green-700 bg-green-50'
                  : 'text-gray-700 hover:text-green-700 hover:bg-green-50'
              }`}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Jogos
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}