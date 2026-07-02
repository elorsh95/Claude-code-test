import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { HouseholdProvider, useHousehold } from '../contexts/HouseholdContext';
import { useAuth } from '../contexts/AuthContext';
import { subscribePendingInvitations } from '../lib/invitations';
import { Onboarding } from './Onboarding';
import { AccountModal } from './AccountModal';
import type { Invitation } from '../types';

// זיהוי סביבה לפי הדומיין - התג DEV יופיע רק כשלא רצים על אחד מדומייני ה-prod
const PROD_HOSTS = [
  'house-hold-tasks-587ef.web.app',
  'house-hold-tasks.com',
  'www.house-hold-tasks.com',
];
const isDevEnv =
  typeof window !== 'undefined' &&
  !PROD_HOSTS.includes(window.location.hostname);

function LayoutInner() {
  const { user, logout } = useAuth();
  const { loading, error, activeHousehold, households } = useHousehold();
  const [pending, setPending] = useState<Invitation[]>([]);
  const [showAccount, setShowAccount] = useState(false);
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

  // שגיאת טעינה -> הודעה עם אפשרות רענון (במקום ספינר אינסופי)
  if (error) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="error-banner">{error}</div>
          <button className="btn btn-block" onClick={() => window.location.reload()}>
            רענון
          </button>
          <p className="auth-switch">
            <button className="btn-ghost btn btn-sm" onClick={() => logout()}>
              התנתקות
            </button>
          </p>
        </div>
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
          <h1>
            משימות המשפחה
            {isDevEnv && <span className="env-badge">DEV</span>}
          </h1>
          <div className="household-name">
            {activeHousehold.name}
            {households.length > 1 ? ' ▾' : ''}
          </div>
        </div>
        <button
          className="icon-btn"
          onClick={() => setShowAccount(true)}
          title="הגדרות חשבון"
          aria-label="הגדרות חשבון"
        >
          ⚙️
        </button>
      </header>

      {showAccount && <AccountModal onClose={() => setShowAccount(false)} />}

      <main className="content" key={location.pathname}>
        <Outlet />
      </main>

      <nav className="tabbar">
        <NavLink to="/" end>
          <span className="icon">📋</span>
          משימות
        </NavLink>
        <NavLink to="/leaderboard">
          <span className="icon">🏆</span>
          ניקוד
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
