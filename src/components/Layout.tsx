import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { HouseholdProvider, useHousehold } from '../contexts/HouseholdContext';
import { useAuth } from '../contexts/AuthContext';
import { subscribePendingInvitations } from '../lib/invitations';
import { Onboarding } from './Onboarding';
import type { Invitation } from '../types';

function LayoutInner() {
  const { user, logout } = useAuth();
  const { loading, activeHousehold, households } = useHousehold();
  const [pending, setPending] = useState<Invitation[]>([]);
  const location = useLocation();

  useEffect(() => {
    if (!user?.email) return;
    return subscribePendingInvitations(user.email, setPending);
  }, [user?.email]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  // אין חשבון משפחתי פעיל -> מסך פתיחה (יצירת חשבון או קבלת הזמנה)
  if (!activeHousehold) {
    return <Onboarding pending={pending} />;
  }

  const showInvitesTab = pending.length > 0;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>משימות המשפחה</h1>
          <div className="household-name">
            {activeHousehold.name}
            {households.length > 1 ? ' ▾' : ''}
          </div>
        </div>
        <button className="btn-ghost btn btn-sm" onClick={() => logout()}>
          התנתקות
        </button>
      </header>

      <main className="content" key={location.pathname}>
        <Outlet />
      </main>

      <nav className="tabbar">
        <NavLink to="/" end>
          <span className="icon">📋</span>
          משימות
        </NavLink>
        <NavLink to="/members">
          <span className="icon">👨‍👩‍👧‍👦</span>
          המשפחה
        </NavLink>
        {showInvitesTab && (
          <NavLink to="/invitations">
            <span className="icon">✉️</span>
            הזמנות
            <span className="badge">{pending.length}</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
}

export function Layout() {
  return (
    <HouseholdProvider>
      <LayoutInner />
    </HouseholdProvider>
  );
}
