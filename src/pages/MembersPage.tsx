import { useEffect, useState } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import {
  cancelInvitation,
  subscribeHouseholdInvitations,
} from '../lib/invitations';
import { hasPermission } from '../lib/permissions';
import { initials } from '../lib/format';
import { InviteModal } from '../components/InviteModal';
import { InviteLinkModal } from '../components/InviteLinkModal';
import { MemberEditModal } from '../components/MemberEditModal';
import type { Invitation, Member } from '../types';

export function MembersPage() {
  const { activeHousehold, members, currentMember } = useHousehold();
  const [pending, setPending] = useState<Invitation[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [linkInvite, setLinkInvite] = useState<Invitation | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);

  const canManage = hasPermission(currentMember, 'canManageMembers');

  useEffect(() => {
    if (!activeHousehold || !canManage) return;
    return subscribeHouseholdInvitations(activeHousehold.id, setPending);
  }, [activeHousehold, canManage]);

  return (
    <div>
      <div className="section-header">
        <h2>בני המשפחה</h2>
        {canManage && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowInvite(true)}
          >
            ＋ הזמנה
          </button>
        )}
      </div>

      {members.map((m) => (
        <div
          className="card member-row"
          key={m.userId}
          onClick={() => canManage && setEditMember(m)}
          style={{ cursor: canManage ? 'pointer' : 'default' }}
        >
          <div className="avatar">{initials(m.displayName)}</div>
          <div className="member-info">
            <div className="member-name">
              {m.displayName}
              {m.isOwner && <span className="chip" style={{ marginInlineStart: '0.4rem' }}>מנהל המשפחה</span>}
            </div>
            <div className="member-sub">
              {[m.role, m.position].filter(Boolean).join(' · ') || m.email}
            </div>
          </div>
          {canManage && <span className="icon-btn">›</span>}
        </div>
      ))}

      {canManage && pending.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '0.95rem' }}>הזמנות שנשלחו וממתינות</h2>
          </div>
          {pending.map((inv) => (
            <div className="card member-row" key={inv.id}>
              <div className="avatar" style={{ background: 'var(--warning)' }}>
                ✉️
              </div>
              <div className="member-info">
                <div className="member-name">
                  {inv.contactDisplay || inv.contactMasked}
                </div>
                <div className="member-sub">
                  ממתין להצטרפות · {inv.contactType === 'phone' ? 'טלפון' : 'מייל'}{' '}
                  · תפקיד: {inv.role}
                </div>
              </div>
              <div className="task-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setLinkInvite(inv)}
                >
                  קישור
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => cancelInvitation(inv.id)}
                >
                  ביטול
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      {linkInvite && (
        <InviteLinkModal
          inviteId={linkInvite.id}
          householdName={linkInvite.householdName}
          role={linkInvite.role}
          onClose={() => setLinkInvite(null)}
        />
      )}
      {editMember && (
        <MemberEditModal
          member={editMember}
          onClose={() => setEditMember(null)}
        />
      )}
    </div>
  );
}
