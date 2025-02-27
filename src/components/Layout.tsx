import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useSidebar } from '../contexts/SidebarContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isOpen, toggleSidebar } = useSidebar();

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header fixo */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header />
      </div>

      <div className="flex pt-16"> {/* pt-16 para compensar a altura do header fixo */}
        {/* Sidebar fixa */}
        <div 
          className={`fixed left-0 top-16 bottom-0 w-64 transform transition-transform duration-300 ease-in-out z-40
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <Sidebar />
        </div>

        {/* Overlay for both mobile and desktop */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-30"
            onClick={toggleSidebar}
          />
        )}

        {/* Conteúdo principal com margem dinâmica */}
        <main className={`flex-1 transition-all duration-300 ease-in-out ${isOpen ? 'ml-64' : ''} p-8`}>
          {children}
        </main>
      </div>
    </div>
  );
}