import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { JoinPage } from './pages/JoinPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { DashboardPage } from './pages/DashboardPage';
import { MembersPage } from './pages/MembersPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { RewardsPage } from './pages/RewardsPage';
import { InvitationsPage } from './pages/InvitationsPage';
import { RootGate } from './components/RootGate';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/join/:inviteId', element: <JoinPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/terms', element: <TermsPage /> },
  {
    path: '/',
    element: <RootGate />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'rewards', element: <RewardsPage /> },
      { path: 'members', element: <MembersPage /> },
      { path: 'invitations', element: <InvitationsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
