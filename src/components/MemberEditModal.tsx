import { useState } from 'react';
import { Modal } from './Modal';
import { PermissionsEditor } from './PermissionsEditor';
import { useHousehold } from '../contexts/HouseholdContext';
import { removeMember, updateMember, updateMemberName } from '../lib/members';
import type { Member, Permissions } from '../types';

export function MemberEditModal({
  member,
  onClose,
}: {
  member: Member;
  onClose: () => void;
}) {
  const { activeHousehold } = useHousehold();
  const [name, setName] = useState(member.displayName);
  const [role, setRole] = useState(member.role);
  const [position, setPosition] = useState(member.position);
  const [permissions, setPermissions] = useState<Permissions>({
    ...member.permissions,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isOwner = member.isOwner;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeHousehold || isOwner) return;
    setBusy(true);
    setError('');
    try {
      if (name.trim() && name.trim() !== member.displayName) {
        await updateMemberName(activeHousehold.id, member.userId, name.trim());
      }
      await updateMember(activeHousehold.id, member.userId, {
        role,
        position,
        permissions,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!activeHousehold || isOwner) return;
    if (!confirm(`להסיר את ${member.displayName} מהחשבון?`)) return;
    setBusy(true);
    try {
      await removeMember(activeHousehold.id, member.userId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהסרה');
      setBusy(false);
    }
  }

  return (
    <Modal title={member.displayName} onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      {isOwner && (
        <div className="info-banner">
          זהו בעל החשבון (מנהל המשפחה) — יש לו את כל ההרשאות ולא ניתן לשנותן.
        </div>
      )}
      <form onSubmit={handleSave}>
        {!isOwner && (
          <div className="field">
            <label htmlFor="member-name">שם</label>
            <input
              id="member-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}
        <PermissionsEditor
          role={role}
          position={position}
          permissions={permissions}
          onRoleChange={setRole}
          onPositionChange={setPosition}
          onPermissionsChange={setPermissions}
          disabled={isOwner}
        />

        {!isOwner && (
          <>
            <div className="modal-actions">
              <button className="btn" type="submit" disabled={busy}>
                שמירה
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
            <button
              className="btn btn-danger btn-block"
              type="button"
              onClick={handleRemove}
              disabled={busy}
              style={{ marginTop: '0.6rem' }}
            >
              הסרת החבר מהחשבון
            </button>
          </>
        )}
      </form>
    </Modal>
  );
}
