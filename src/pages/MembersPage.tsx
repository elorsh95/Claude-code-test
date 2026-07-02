import { useEffect, useMemo, useState } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import {
  cancelInvitation,
  subscribeHouseholdInvitations,
} from '../lib/invitations';
import { subscribeCompletions } from '../lib/tasks';
import { hasPermission } from '../lib/permissions';
import { initials } from '../lib/format';
import { InviteModal } from '../components/InviteModal';
import { InviteLinkModal } from '../components/InviteLinkModal';
import { MemberEditModal } from '../components/MemberEditModal';
import type { Completion, Invitation, Member } from '../types';

export function MembersPage() {
  const { activeHousehold, members, currentMember } = useHousehold();
  const [pending, setPending] = useState<Invitation[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [linkInvite, setLinkInvite] = useState<Invitation | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);

  const canManage = hasPermission(currentMember, 'canManageMembers');

  useEffect(() => {
    if (!activeHousehold || !canManage) return;
    return subscribeHouseholdInvitations(activeHousehold.id, setPending);
  }, [activeHousehold, canManage]);

  useEffect(() => {
    if (!activeHousehold) return;
    return subscribeCompletions(activeHousehold.id, setCompletions);
  }, [activeHousehold]);

  // צבירת נקודות לכל חבר מתוך רשומות הביצוע
  const pointsByUser = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of completions) {
      map[c.actorId] = (map[c.actorId] ?? 0) + (c.points ?? 0);
    }
    return map;
  }, [completions]);

  // דירוג מובילים (רק חברים עם נקודות)
  const leaderboard = useMemo(
    () =>
      members
        .map((m) => ({ member: m, points: pointsByUser[m.userId] ?? 0 }))
        .filter((x) => x.points > 0)
        .sort((a, b) => b.points - a.points),
    [members, pointsByUser]
  );

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
          <span className="chip">⭐ {pointsByUser[m.userId] ?? 0}</span>
          {canManage && <span className="icon-btn">›</span>}
        </div>
      ))}

      {leaderboard.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '0.95rem' }}>🏆 לוח המובילים</h2>
          </div>
          {leaderboard.map((row, i) => (
            <div className="card member-row" key={row.member.userId}>
              <div
                className="avatar"
                style={
                  i === 0
                    ? { background: '#f59e0b' }
                    : i === 1
                      ? { background: '#94a3b8' }
                      : i === 2
                        ? { background: '#b45309' }
                        : undefined
                }
              >
                {i + 1}
              </div>
              <div className="member-info">
                <div className="member-name">{row.member.displayName}</div>
                <div className="member-sub">
                  {[row.member.role, row.member.position]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <span className="chip">⭐ {row.points}</span>
            </div>
          ))}
        </>
      )}

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
