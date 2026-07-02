import { useEffect, useMemo, useState } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import {
  cancelInvitation,
  subscribeHouseholdInvitations,
} from '../lib/invitations';
import { subscribeCompletions } from '../lib/tasks';
import {
  resetPointsNow,
  setPointsPeriod,
  subscribeHousehold,
} from '../lib/households';
import { hasPermission } from '../lib/permissions';
import { initials, dateInputToDate, dateToInputValue } from '../lib/format';
import {
  PERIOD_LABELS,
  isCurrentPeriod,
  periodEnd,
  periodRangeLabel,
  periodStart,
} from '../lib/points';
import { InviteModal } from '../components/InviteModal';
import { InviteLinkModal } from '../components/InviteLinkModal';
import { MemberEditModal } from '../components/MemberEditModal';
import { Timestamp } from 'firebase/firestore';
import type { Completion, Household, Invitation, Member, PointsPeriod } from '../types';

export function MembersPage() {
  const { activeHousehold, members, currentMember } = useHousehold();
  const [pending, setPending] = useState<Invitation[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [anchorInput, setAnchorInput] = useState(dateToInputValue(Timestamp.now()));
  const [showInvite, setShowInvite] = useState(false);
  const [linkInvite, setLinkInvite] = useState<Invitation | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);

  const canManage = hasPermission(currentMember, 'canManageMembers');
  const canReset = hasPermission(currentMember, 'canResetPoints');

  useEffect(() => {
    if (!activeHousehold || !canManage) return;
    return subscribeHouseholdInvitations(activeHousehold.id, setPending);
  }, [activeHousehold, canManage]);

  useEffect(() => {
    if (!activeHousehold) return;
    return subscribeCompletions(activeHousehold.id, setCompletions);
  }, [activeHousehold]);

  useEffect(() => {
    if (!activeHousehold) return;
    return subscribeHousehold(activeHousehold.id, setHousehold);
  }, [activeHousehold]);

  const period: PointsPeriod = household?.pointsPeriod ?? 'weekly';

  // חלון הזמן לחישוב הנקודות (לפי התקופה + תאריך שנבחר + מועד איפוס)
  const pointsWindow = useMemo(() => {
    const anchor = dateInputToDate(anchorInput) ?? new Date();
    const now = new Date();
    let start = periodStart(anchor, period);
    const end = periodEnd(anchor, period);
    const resetAt = household?.pointsResetAt?.toDate();
    if (resetAt && isCurrentPeriod(anchor, period, now) && resetAt > start) {
      start = resetAt;
    }
    return { start, end, anchor };
  }, [anchorInput, period, household?.pointsResetAt]);

  // צבירת נקודות לכל חבר (לפי המוטב) בתוך חלון הזמן
  const pointsByUser = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of completions) {
      const t = c.at?.toDate();
      if (!t || t < pointsWindow.start || t >= pointsWindow.end) continue;
      const uid = c.beneficiaryId ?? c.actorId;
      map[uid] = (map[uid] ?? 0) + (c.points ?? 0);
    }
    return map;
  }, [completions, pointsWindow]);

  async function handlePeriodChange(p: PointsPeriod) {
    if (!activeHousehold) return;
    await setPointsPeriod(activeHousehold.id, p);
  }

  async function handleReset() {
    if (!activeHousehold) return;
    if (!confirm('לאפס את הנקודות מעכשיו? ההיסטוריה תישמר.')) return;
    await resetPointsNow(activeHousehold.id);
  }

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

      <div className="section-header" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '0.95rem' }}>🏆 לוח המובילים</h2>
        {canReset && (
          <button className="btn btn-ghost btn-sm" onClick={handleReset}>
            איפוס נקודות
          </button>
        )}
      </div>

      <div className="card">
        <div className="field" style={{ marginBottom: '0.6rem' }}>
          <label>שיטת ספירה</label>
          <select
            value={period}
            disabled={!canReset && !canManage}
            onChange={(e) => handlePeriodChange(e.target.value as PointsPeriod)}
          >
            <option value="daily">יומי (מתאפס בחצות)</option>
            <option value="weekly">שבועי (מתאפס במוצ"ש)</option>
            <option value="monthly">חודשי (מתאפס ב-1 לחודש)</option>
            <option value="all">כל הזמן</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>צפייה בתאריך</label>
          <input
            type="date"
            value={anchorInput}
            onChange={(e) => setAnchorInput(e.target.value)}
          />
          <div className="member-sub" style={{ marginTop: '0.35rem' }}>
            תקופה: {PERIOD_LABELS[period]}
            {period !== 'all' && ` · ${periodRangeLabel(pointsWindow.anchor, period)}`}
          </div>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="empty-state" style={{ padding: '1.5rem' }}>
          אין נקודות בתקופה זו
        </div>
      ) : (
        <>
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
