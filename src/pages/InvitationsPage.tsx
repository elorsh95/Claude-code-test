import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import {
  acceptInvitation,
  declineInvitation,
  subscribePendingInvitations,
} from '../lib/invitations';
import type { Invitation } from '../types';

export function InvitationsPage() {
  const { user } = useAuth();
  const { refresh, selectHousehold } = useHousehold();
  const navigate = useNavigate();
  const [pending, setPending] = useState<Invitation[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    return subscribePendingInvitations(user.email, setPending);
  }, [user?.email]);

  async function handleAccept(inv: Invitation) {
    if (!user) return;
    setBusy(true);
    try {
      await acceptInvitation(inv, user);
      await refresh();
      selectHousehold(inv.householdId);
      navigate('/');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="section-header">
        <h2>הזמנות שממתינות לך</h2>
      </div>

      {pending.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">✉️</span>
          אין הזמנות חדשות
        </div>
      ) : (
        pending.map((inv) => (
          <div className="card" key={inv.id}>
            <div className="member-name">{inv.householdName}</div>
            <div className="member-sub">
              הוזמנת ע"י {inv.invitedByName} · תפקיד: {inv.role}
              {inv.position ? ` · ${inv.position}` : ''}
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
        ))
      )}
    </div>
  );
}
