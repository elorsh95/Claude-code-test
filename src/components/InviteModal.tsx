import { useState } from 'react';
import { Modal } from './Modal';
import { PermissionsEditor } from './PermissionsEditor';
import { InviteLinkModal } from './InviteLinkModal';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { createInvitation } from '../lib/invitations';
import { PRESETS } from '../lib/permissions';
import { normalizePhone } from '../lib/format';
import type { ContactType, Permissions } from '../types';

export function InviteModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { activeHousehold } = useHousehold();

  const adultPreset = PRESETS.find((p) => p.id === 'adult')!;
  const [contactType, setContactType] = useState<ContactType>('email');
  const [contactInput, setContactInput] = useState('');
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

    const display = contactInput.trim();
    const value =
      contactType === 'email' ? display.toLowerCase() : normalizePhone(display);
    if (!value) {
      setError(
        contactType === 'email' ? 'יש להזין אימייל' : 'יש להזין מספר טלפון'
      );
      return;
    }
    if (contactType === 'email' && !/^\S+@\S+\.\S+$/.test(value)) {
      setError('כתובת אימייל לא תקינה');
      return;
    }
    if (contactType === 'phone' && value.length < 8) {
      setError('מספר טלפון לא תקין');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const id = await createInvitation({
        householdId: activeHousehold.id,
        householdName: activeHousehold.name,
        contactType,
        contactValue: value,
        contactDisplay: display,
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
        ההזמנה תינעל לאיש ספציפי — רק מי שנרשם/מתחבר עם המייל או הטלפון שתזין
        יוכל להצטרף דרך הקישור.
      </p>
      <form onSubmit={handleCreate}>
        <div className="field">
          <label>נעילת ההזמנה לפי</label>
          <div className="filter-tabs" style={{ marginBottom: '0.6rem' }}>
            <button
              type="button"
              className={contactType === 'email' ? 'active' : ''}
              onClick={() => setContactType('email')}
            >
              אימייל
            </button>
            <button
              type="button"
              className={contactType === 'phone' ? 'active' : ''}
              onClick={() => setContactType('phone')}
            >
              טלפון
            </button>
          </div>
          <input
            type={contactType === 'email' ? 'email' : 'tel'}
            inputMode={contactType === 'email' ? 'email' : 'tel'}
            placeholder={
              contactType === 'email' ? 'name@example.com' : '050-1234567'
            }
            value={contactInput}
            onChange={(e) => setContactInput(e.target.value)}
            required
          />
          {contactType === 'phone' && (
            <div className="member-sub" style={{ marginTop: '0.35rem' }}>
              המוזמן יצטרך להזין את אותו מספר בהרשמה.
            </div>
          )}
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
