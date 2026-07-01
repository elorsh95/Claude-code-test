import { useState } from 'react';
import { Modal } from './Modal';
import { PermissionsEditor } from './PermissionsEditor';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { createInvitation } from '../lib/invitations';
import { PRESETS } from '../lib/permissions';
import type { Permissions } from '../types';

export function InviteModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { activeHousehold } = useHousehold();

  const adultPreset = PRESETS.find((p) => p.id === 'adult')!;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(adultPreset.role);
  const [position, setPosition] = useState(adultPreset.position);
  const [permissions, setPermissions] = useState<Permissions>({
    ...adultPreset.permissions,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !activeHousehold || !email.trim()) return;
    setBusy(true);
    setError('');
    try {
      await createInvitation({
        householdId: activeHousehold.id,
        householdName: activeHousehold.name,
        email,
        role,
        position,
        permissions,
        invitedBy: user.uid,
        invitedByName: user.displayName,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת ההזמנה');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Modal title="ההזמנה נשלחה" onClose={onClose}>
        <div className="info-banner">
          נשלחה הזמנה אל <strong>{email}</strong>. ברגע שהמשתמש יירשם או יתחבר
          עם אימייל זה, ההזמנה תופיע לו לאישור.
        </div>
        <button className="btn btn-block" onClick={onClose}>
          סגירה
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="הזמנת בן משפחה" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="invite-email">אימייל של המוזמן</label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            autoFocus
          />
        </div>

        <PermissionsEditor
          role={role}
          position={position}
          permissions={permissions}
          onRoleChange={setRole}
          onPositionChange={setPosition}
          onPermissionsChange={setPermissions}
        />

        <div className="modal-actions">
          <button className="btn" type="submit" disabled={busy || !email.trim()}>
            שליחת הזמנה
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            ביטול
          </button>
        </div>
      </form>
    </Modal>
  );
}
