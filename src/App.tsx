import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import MembersList from './pages/MembersList';
import Games from './pages/Games';
import CreateGame from './pages/CreateGame';
import GameConfirmation from './pages/GameConfirmation';
import GameTeams from './pages/GameTeams';
import AdminPage from './pages/AdminPage';
import EditMember from './pages/EditMember';
import Dashboard from './pages/Dashboard';
import RegistrationDashboard from './pages/RegistrationDashboard';
import GamesDashboard from './pages/GamesDashboard';
import PlayerPerformance from './pages/PlayerPerformance';
import Settings from './pages/Settings';
import Invitation from './pages/Invitation';
import Statute from './pages/Statute';
import Anthem from './pages/Anthem';
import FinancialDashboard from './pages/FinancialDashboard';
import AccountsChart from './pages/AccountsChart';
import Transactions from './pages/Transactions';
import MonthlyFees from './pages/MonthlyFees';
import ClubEdit from './pages/ClubEdit';
import PrivateRoute from './pages/PrivateRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/game-confirmation/:gameId" element={<GameConfirmation />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/registration/stats"
        element={
          <PrivateRoute>
            <RegistrationDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/games/stats"
        element={
          <PrivateRoute>
            <GamesDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/games/performance"
        element={
          <PrivateRoute>
            <PlayerPerformance />
          </PrivateRoute>
        }
      />
      <Route
        path="/members"
        element={
          <PrivateRoute>
            <MembersList />
          </PrivateRoute>
        }
      />
      <Route
        path="/members/edit/:id"
        element={
          <PrivateRoute>
            <EditMember />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <AdminPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/games"
        element={
          <PrivateRoute>
            <Games />
          </PrivateRoute>
        }
      />
      <Route
        path="/games/create"
        element={
          <PrivateRoute>
            <CreateGame />
          </PrivateRoute>
        }
      />
      <Route
        path="/games/teams/:gameId"
        element={
          <PrivateRoute>
            <GameTeams />
          </PrivateRoute>
        }
      />
      <Route
        path="/club/settings"
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        }
      />
      <Route
        path="/club/edit"
        element={
          <PrivateRoute>
            <ClubEdit />
          </PrivateRoute>
        }
      />
      <Route
        path="/club/invitation"
        element={
          <PrivateRoute>
            <Invitation />
          </PrivateRoute>
        }
      />
      <Route
        path="/club/statute"
        element={
          <PrivateRoute>
            <Statute />
          </PrivateRoute>
        }
      />
      <Route
        path="/club/anthem"
        element={
          <PrivateRoute>
            <Anthem />
          </PrivateRoute>
        }
      />
      <Route
        path="/financial"
        element={
          <PrivateRoute>
            <FinancialDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/financial/accounts"
        element={
          <PrivateRoute>
            <AccountsChart />
          </PrivateRoute>
        }
      />
      <Route
        path="/financial/transactions"
        element={
          <PrivateRoute>
            <Transactions />
          </PrivateRoute>
        }
      />
      <Route
        path="/financial/monthly-fees"
        element={
          <PrivateRoute>
            <MonthlyFees />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;