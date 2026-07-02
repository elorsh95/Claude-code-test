import { useState } from 'react';
import { Modal } from './Modal';
import { PermissionsEditor } from './PermissionsEditor';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { buildInviteLink, createInvitation } from '../lib/invitations';
import { PRESETS } from '../lib/permissions';
import type { Permissions } from '../types';

export function InviteModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { activeHousehold } = useHousehold();

  const adultPreset = PRESETS.find((p) => p.id === 'adult')!;
  const [role, setRole] = useState(adultPreset.role);
  const [position, setPosition] = useState(adultPreset.position);
  const [permissions, setPermissions] = useState<Permissions>({
    ...adultPreset.permissions,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !activeHousehold) return;
    setBusy(true);
    setError('');
    try {
      const inviteId = await createInvitation({
        householdId: activeHousehold.id,
        householdName: activeHousehold.name,
        role,
        position,
        permissions,
        invitedBy: user.uid,
        invitedByName: user.displayName,
      });
      setLink(buildInviteLink(inviteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת הקישור');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('לא ניתן להעתיק אוטומטית — סמן והעתק ידנית');
    }
  }

  const waText = encodeURIComponent(
    `הוזמנת להצטרף ל"${activeHousehold?.name}" באפליקציית משימות המשפחה 🏠\n` +
      `הצטרפות בקישור: ${link}`
  );
  const waHref = `https://wa.me/?text=${waText}`;

  if (link) {
    return (
      <Modal title="קישור ההזמנה מוכן" onClose={onClose}>
        <div className="info-banner">
          שתף את הקישור עם בן המשפחה. מי שיפתח אותו ויתחבר/יירשם — יצטרף לחשבון
          בתפקיד <strong>{role}</strong> עם ההרשאות שהגדרת.
        </div>

        <div className="field">
          <label>קישור ההזמנה</label>
          <input type="text" value={link} readOnly onFocus={(e) => e.target.select()} />
        </div>

        <div className="modal-actions">
          <a className="btn" href={waHref} target="_blank" rel="noreferrer">
            שיתוף בוואטסאפ
          </a>
          <button className="btn btn-secondary" type="button" onClick={copyLink}>
            {copied ? '✓ הועתק' : 'העתקת קישור'}
          </button>
        </div>

        <button
          className="btn btn-ghost btn-block"
          onClick={onClose}
          style={{ marginTop: '0.6rem' }}
        >
          סגירה
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="הזמנת בן משפחה" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <p className="member-sub" style={{ marginBottom: '1rem' }}>
        הגדר תפקיד והרשאות, וקבל קישור לשיתוף בוואטסאפ.
      </p>
      <form onSubmit={handleCreate}>
        <PermissionsEditor
          role={role}
          position={position}
          permissions={permissions}
          onRoleChange={setRole}
          onPositionChange={setPosition}
          onPermissionsChange={setPermissions}
        />

        <div className="modal-actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'יוצר…' : 'יצירת קישור הזמנה'}
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
