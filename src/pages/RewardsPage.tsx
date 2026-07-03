import { useEffect, useMemo, useState } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { subscribeCompletions } from '../lib/tasks';
import {
  computeLedgers,
  createReward,
  deleteRedemption,
  deleteReward,
  redeemReward,
  subscribeRedemptions,
  subscribeRewards,
  updateReward,
} from '../lib/rewards';
import { hasPermission } from '../lib/permissions';
import { formatDateTime } from '../lib/format';
import { Modal } from '../components/Modal';
import type { Completion, Redemption, Reward } from '../types';

export function RewardsPage() {
  const { activeHousehold, members, currentMember } = useHousehold();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [targetUserId, setTargetUserId] = useState(
    currentMember?.userId ?? ''
  );
  const [editing, setEditing] = useState<Reward | 'new' | null>(null);
  const [busy, setBusy] = useState(false);

  const canManage = hasPermission(currentMember, 'canManageMembers');

  useEffect(() => {
    if (!activeHousehold) return;
    return subscribeRewards(activeHousehold.id, setRewards);
  }, [activeHousehold]);
  useEffect(() => {
    if (!activeHousehold) return;
    return subscribeCompletions(activeHousehold.id, setCompletions);
  }, [activeHousehold]);
  useEffect(() => {
    if (!activeHousehold) return;
    return subscribeRedemptions(activeHousehold.id, setRedemptions);
  }, [activeHousehold]);

  useEffect(() => {
    if (currentMember && !targetUserId) setTargetUserId(currentMember.userId);
  }, [currentMember, targetUserId]);

  const ledgers = useMemo(
    () => computeLedgers(completions, redemptions),
    [completions, redemptions]
  );
  const emptyLedger = { earned: 0, redeemed: 0, available: 0 };

  const targetMember =
    members.find((m) => m.userId === targetUserId) ?? currentMember;
  const targetLedger = targetMember
    ? ledgers[targetMember.userId] ?? emptyLedger
    : emptyLedger;
  const targetBalance = targetLedger.available;

  const recentRedemptions = useMemo(
    () =>
      [...redemptions]
        .sort(
          (a, b) => (b.at?.toMillis() ?? 0) - (a.at?.toMillis() ?? 0)
        )
        .slice(0, 15),
    [redemptions]
  );

  async function handleRedeem(reward: Reward) {
    if (!activeHousehold || !currentMember || !targetMember) return;
    if (targetBalance < reward.cost) return;
    const forName = targetMember.displayName;
    if (
      !confirm(
        `לפדות "${reward.title}" עבור ${forName} תמורת ${reward.cost} נקודות?`
      )
    )
      return;
    setBusy(true);
    try {
      await redeemReward(
        activeHousehold.id,
        reward,
        { id: targetMember.userId, name: forName },
        { id: currentMember.userId, name: currentMember.displayName }
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo(r: Redemption) {
    if (!activeHousehold) return;
    if (!confirm(`לבטל את פדיון "${r.rewardTitle}" ולהחזיר ${r.cost} נקודות?`))
      return;
    await deleteRedemption(activeHousehold.id, r.id);
  }

  async function handleDeleteReward(reward: Reward) {
    if (!activeHousehold) return;
    if (!confirm(`למחוק את הפרס "${reward.title}"?`)) return;
    await deleteReward(activeHousehold.id, reward.id);
  }

  const activeRewards = rewards.filter((r) => r.active || canManage);

  return (
    <div>
      <div className="section-header">
        <h2>🎁 חנות פרסים</h2>
        {canManage && (
          <button
            className="btn btn-sm"
            onClick={() => setEditing('new')}
          >
            + פרס חדש
          </button>
        )}
      </div>

      {/* יתרת הארנק */}
      <div className="card">
        <div className="member-sub">נקודות זמינות לפדיון</div>
        <div style={{ fontSize: '2rem', fontWeight: 800, margin: '0.2rem 0' }}>
          ⭐ {targetBalance}
        </div>
        <div className="member-sub">
          נצברו {targetLedger.earned} · נפדו {targetLedger.redeemed}
        </div>
        {canManage && members.length > 1 && (
          <div className="field" style={{ marginBottom: 0, marginTop: '0.5rem' }}>
            <label>פדיון עבור</label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName} (⭐ {ledgers[m.userId]?.available ?? 0})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* קטלוג הפרסים */}
      {activeRewards.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">🎁</span>
          {canManage
            ? 'עדיין אין פרסים. הוסף פרס ראשון!'
            : 'עדיין לא הוגדרו פרסים'}
        </div>
      ) : (
        activeRewards.map((reward) => {
          const affordable = targetBalance >= reward.cost;
          return (
            <div className="card member-row" key={reward.id}>
              <div
                className="avatar"
                style={{ background: 'var(--surface-2, #eef)', fontSize: '1.4rem' }}
              >
                {reward.emoji || '🎁'}
              </div>
              <div className="member-info">
                <div className="member-name">
                  {reward.title}
                  {!reward.active && (
                    <span className="member-sub"> (לא פעיל)</span>
                  )}
                </div>
                <div className="member-sub">⭐ {reward.cost} נקודות</div>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                {canManage && (
                  <>
                    <button
                      className="icon-btn"
                      title="עריכה"
                      onClick={() => setEditing(reward)}
                    >
                      ✏️
                    </button>
                    <button
                      className="icon-btn"
                      title="מחיקה"
                      onClick={() => handleDeleteReward(reward)}
                    >
                      🗑️
                    </button>
                  </>
                )}
                <button
                  className="btn btn-sm"
                  disabled={busy || !affordable || !reward.active}
                  onClick={() => handleRedeem(reward)}
                >
                  {affordable ? 'פדה' : 'חסר נקודות'}
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* היסטוריית פדיונות */}
      {recentRedemptions.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem' }}>היסטוריית פדיונות</h2>
          </div>
          {recentRedemptions.map((r) => (
            <div className="card member-row" key={r.id}>
              <div className="member-info">
                <div className="member-name">
                  {r.rewardTitle} · {r.userName}
                </div>
                <div className="member-sub">
                  ⭐ {r.cost} · {formatDateTime(r.at)}
                  {r.byId !== r.userId ? ` · ע"י ${r.byName}` : ''}
                </div>
              </div>
              {canManage && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleUndo(r)}
                >
                  ביטול
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {editing && (
        <RewardModal
          reward={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (!activeHousehold || !currentMember) return;
            if (editing === 'new') {
              await createReward(activeHousehold.id, data, currentMember.userId);
            } else {
              await updateReward(activeHousehold.id, editing.id, data);
            }
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

interface RewardData {
  title: string;
  cost: number;
  emoji: string;
  active: boolean;
}

function RewardModal({
  reward,
  onClose,
  onSave,
}: {
  reward: Reward | null;
  onClose: () => void;
  onSave: (data: RewardData) => Promise<void>;
}) {
  const [title, setTitle] = useState(reward?.title ?? '');
  const [cost, setCost] = useState(String(reward?.cost ?? 10));
  const [emoji, setEmoji] = useState(reward?.emoji ?? '🎁');
  const [active, setActive] = useState(reward?.active ?? true);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onSave({
        title,
        cost: Number(cost) || 0,
        emoji: emoji.trim() || '🎁',
        active,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={reward ? 'עריכת פרס' : 'פרס חדש'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="r-emoji">אימוג'י</label>
          <input
            id="r-emoji"
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
            style={{ width: '4rem', textAlign: 'center', fontSize: '1.4rem' }}
          />
        </div>
        <div className="field">
          <label htmlFor="r-title">שם הפרס</label>
          <input
            id="r-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="למשל: שעת מסך נוספת"
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="r-cost">עלות בנקודות</label>
          <input
            id="r-cost"
            type="number"
            inputMode="numeric"
            min={0}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            required
          />
        </div>
        <label
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0.5rem 0' }}
        >
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          פעיל (זמין לפדיון)
        </label>
        <button
          className="btn btn-block"
          type="submit"
          disabled={busy || !title.trim()}
        >
          {busy ? 'שומר…' : 'שמירה'}
        </button>
      </form>
    </Modal>
  );
}
