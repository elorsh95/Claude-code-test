import { useState } from 'react';
import { Modal } from './Modal';
import { PermissionsEditor } from './PermissionsEditor';
import { InviteLinkModal } from './InviteLinkModal';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { createInvitation } from '../lib/invitations';
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
  const [inviteId, setInviteId] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !activeHousehold) return;
    setBusy(true);
    setError('');
    try {
      const id = await createInvitation({
        householdId: activeHousehold.id,
        householdName: activeHousehold.name,
        role,
        position,
        permissions,
        invitedBy: user.uid,
        invitedByName: user.displayName,
      });
      setInviteId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת הקישור');
    } finally {
      setBusy(false);
    }
  }

  if (inviteId) {
    return (
      <InviteLinkModal
        inviteId={inviteId}
        householdName={activeHousehold?.name ?? ''}
        role={role}
        onClose={onClose}
      />
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
