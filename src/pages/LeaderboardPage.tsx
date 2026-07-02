import { useEffect, useMemo, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useHousehold } from '../contexts/HouseholdContext';
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
import type { Completion, Household, Member, PointsPeriod } from '../types';

interface Row {
  member: Member;
  points: number;
}

const SPOT_STYLE = {
  1: { color: '#f59e0b', medal: '🥇', avatar: 84, name: '1.35rem', ped: 96, label: 'מקום ראשון' },
  2: { color: '#94a3b8', medal: '🥈', avatar: 66, name: '1.05rem', ped: 66, label: 'מקום שני' },
  3: { color: '#b45309', medal: '🥉', avatar: 58, name: '0.95rem', ped: 46, label: 'מקום שלישי' },
} as const;

function PodiumSpot({ rank, row }: { rank: 1 | 2 | 3; row?: Row }) {
  const s = SPOT_STYLE[rank];
  return (
    <div style={{ flex: 1, maxWidth: '33%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      {row ? (
        <>
          <div style={{ fontSize: rank === 1 ? '1.6rem' : '1.2rem', lineHeight: 1 }}>{s.medal}</div>
          <div
            className="avatar"
            style={{
              width: s.avatar,
              height: s.avatar,
              background: s.color,
              fontSize: s.avatar / 2.6,
              margin: '0.35rem 0',
              boxShadow: '0 4px 10px rgba(15,23,42,0.15)',
            }}
          >
            {initials(row.member.displayName)}
          </div>
          <div style={{ fontSize: s.name, fontWeight: 700, wordBreak: 'break-word' }}>
            {row.member.displayName}
          </div>
          <div className="chip" style={{ margin: '0.3rem 0' }}>⭐ {row.points}</div>
        </>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', paddingBottom: '1rem' }}>—</div>
      )}
      <div
        style={{
          width: '100%',
          height: s.ped,
          background: `linear-gradient(180deg, ${s.color}, ${s.color}cc)`,
          borderRadius: '10px 10px 0 0',
          color: '#fff',
          fontWeight: 800,
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '0.4rem',
        }}
      >
        {rank}
      </div>
    </div>
  );
}

export function LeaderboardPage() {
  const { activeHousehold, members, currentMember } = useHousehold();
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [anchorInput, setAnchorInput] = useState(dateToInputValue(Timestamp.now()));

  const canManage = hasPermission(currentMember, 'canManageMembers');
  const canReset = hasPermission(currentMember, 'canResetPoints');

  useEffect(() => {
    if (!activeHousehold) return;
    return subscribeCompletions(activeHousehold.id, setCompletions);
  }, [activeHousehold]);

  useEffect(() => {
    if (!activeHousehold) return;
    return subscribeHousehold(activeHousehold.id, setHousehold);
  }, [activeHousehold]);

  const period: PointsPeriod = household?.pointsPeriod ?? 'weekly';

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

  const leaderboard: Row[] = useMemo(
    () =>
      members
        .map((m) => ({ member: m, points: pointsByUser[m.userId] ?? 0 }))
        .filter((x) => x.points > 0)
        .sort((a, b) => b.points - a.points),
    [members, pointsByUser]
  );

  async function handlePeriodChange(p: PointsPeriod) {
    if (activeHousehold) await setPointsPeriod(activeHousehold.id, p);
  }
  async function handleReset() {
    if (!activeHousehold) return;
    if (!confirm('לאפס את הנקודות מעכשיו? ההיסטוריה תישמר.')) return;
    await resetPointsNow(activeHousehold.id);
  }

  const rest = leaderboard.slice(3);

  return (
    <div>
      <div className="section-header">
        <h2>🏆 טבלת הניקוד</h2>
        {canReset && (
          <button className="btn btn-ghost btn-sm" onClick={handleReset}>
            איפוס
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
        <div className="empty-state">
          <span className="emoji">🏅</span>
          אין נקודות בתקופה זו
        </div>
      ) : (
        <>
          {/* פודיום: שני, ראשון, שלישי */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '0.4rem', margin: '1.2rem 0' }}>
            <PodiumSpot rank={2} row={leaderboard[1]} />
            <PodiumSpot rank={1} row={leaderboard[0]} />
            <PodiumSpot rank={3} row={leaderboard[2]} />
          </div>

          {rest.length > 0 &&
            rest.map((row, i) => (
              <div className="card member-row" key={row.member.userId}>
                <div className="avatar" style={{ background: 'var(--text-muted)' }}>
                  {i + 4}
                </div>
                <div className="member-info">
                  <div className="member-name">{row.member.displayName}</div>
                  <div className="member-sub">
                    {[row.member.role, row.member.position].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className="chip">⭐ {row.points}</span>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
