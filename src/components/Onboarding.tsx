import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { acceptInvitation, declineInvitation } from '../lib/invitations';
import type { Invitation } from '../types';

export function Onboarding({ pending }: { pending: Invitation[] }) {
  const { user, logout } = useAuth();
  const { createNewHousehold, refresh } = useHousehold();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await createNewHousehold(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת החשבון');
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept(invite: Invitation) {
    if (!user) return;
    setBusy(true);
    try {
      await acceptInvitation(invite, user);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בקבלת ההזמנה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>ברוך הבא, {user?.displayName} 👋</h2>
        <p className="subtitle">
          כדי להתחיל, צור חשבון משפחתי חדש או הצטרף לחשבון קיים
        </p>

        {error && <div className="error-banner">{error}</div>}

        {pending.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.6rem' }}>
              הזמנות שממתינות לך
            </h3>
            {pending.map((inv) => (
              <div className="card" key={inv.id}>
                <div className="member-name">{inv.householdName}</div>
                <div className="member-sub">
                  הוזמנת ע"י {inv.invitedByName} · תפקיד: {inv.role}
                </div>
                <div className="modal-actions">
                  <button
                    className="btn btn-sm"
                    disabled={busy}
                    onClick={() => handleAccept(inv)}
                  >
                    הצטרפות
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={busy}
                    onClick={() => declineInvitation(inv.id)}
                  >
                    דחייה
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="hname">שם החשבון המשפחתי</label>
            <input
              id="hname"
              type="text"
              placeholder="למשל: משפחת כהן"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button className="btn btn-block" type="submit" disabled={busy || !name.trim()}>
            יצירת חשבון משפחתי
          </button>
        </form>

        <p className="auth-switch">
          <button className="btn-ghost btn btn-sm" onClick={() => logout()}>
            התנתקות
          </button>
        </p>
      </div>
    </div>
  );
}
