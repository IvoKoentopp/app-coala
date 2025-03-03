import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, Calendar, Wallet, LogOut, ChevronDown, ChevronRight, 
  UserCog, User, PlusCircle, List, Book, Music, Mail, Settings, 
  BarChart, DollarSign, PieChart, FileText, CreditCard
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [isClubOpen, setIsClubOpen] = useState(true);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [isGamesOpen, setIsGamesOpen] = useState(true);
  const [isFinancialOpen, setIsFinancialOpen] = useState(true);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const clubSubmenu = [
    { path: '/club/invitation', icon: Mail, label: 'Convite' },
    { path: '/club/statute', icon: Book, label: 'Estatuto' },
    { path: '/club/anthem', icon: Music, label: 'Hino' },
    { path: '/club/settings', icon: Settings, label: 'Configurações' }
  ];

  const registrationSubmenu = [
    { path: '/registration/stats', icon: BarChart, label: 'Painel' },
    { path: '/admin', icon: UserCog, label: 'Administrador' },
    { path: '/members', icon: User, label: 'Sócios' },
  ];

  const gamesSubmenu = [
    { path: '/games/stats', icon: BarChart, label: 'Painel' },
    { path: '/games/create', icon: PlusCircle, label: 'Criar' },
    { path: '/games', icon: List, label: 'Listagem' },
  ];

  const financialSubmenu = [
    { path: '/financial', icon: PieChart, label: 'Painel' },
    { path: '/financial/accounts', icon: FileText, label: 'Plano de Contas' },
    { path: '/financial/transactions', icon: DollarSign, label: 'Movimentações' },
    { path: '/financial/monthly-fees', icon: CreditCard, label: 'Mensalidades' },
  ];

  return (
    <aside className="bg-white h-full shadow-lg overflow-y-auto">
      <nav className="mt-8">
        <div className="px-4">
          {/* Club Menu with Submenu */}
          <div className="mb-2">
            <button
              onClick={() => setIsClubOpen(!isClubOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isClubOpen ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <div className="flex items-center">
                <Book className="w-5 h-5 mr-3" />
                Clube
              </div>
              {isClubOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            
            {/* Club Submenu */}
            {isClubOpen && (
              <div className="ml-4 mt-2 space-y-1">
                {clubSubmenu.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Registration Menu with Submenu */}
          <div className="mb-2">
            <button
              onClick={() => setIsRegistrationOpen(!isRegistrationOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isRegistrationOpen ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-3" />
                Cadastro
              </div>
              {isRegistrationOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            
            {/* Registration Submenu */}
            {isRegistrationOpen && (
              <div className="ml-4 mt-2 space-y-1">
                {registrationSubmenu.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Games Menu with Submenu */}
          <div className="mb-2">
            <button
              onClick={() => setIsGamesOpen(!isGamesOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isGamesOpen ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-3" />
                Jogos
              </div>
              {isGamesOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            
            {/* Games Submenu */}
            {isGamesOpen && (
              <div className="ml-4 mt-2 space-y-1">
                {gamesSubmenu.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Financial Menu with Submenu */}
          <div className="mb-2">
            <button
              onClick={() => setIsFinancialOpen(!isFinancialOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isFinancialOpen ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <div className="flex items-center">
                <Wallet className="w-5 h-5 mr-3" />
                Financeiro
              </div>
              {isFinancialOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            
            {/* Financial Submenu */}
            {isFinancialOpen && (
              <div className="ml-4 mt-2 space-y-1">
                {financialSubmenu.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="px-4 mt-8 mb-8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </button>
        </div>
      </nav>
    </aside>
  );
}