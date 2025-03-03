import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-green-50">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return user ? (
    <Layout>{children}</Layout>
  ) : (
    <Navigate to="/login" replace />
  );
}