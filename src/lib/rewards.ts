import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Completion, Redemption, Reward } from '../types';

function rewardsCol(householdId: string) {
  return collection(db, 'households', householdId, 'rewards');
}

function redemptionsCol(householdId: string) {
  return collection(db, 'households', householdId, 'redemptions');
}

/** מאזין לקטלוג הפרסים של החשבון */
export function subscribeRewards(
  householdId: string,
  callback: (items: Reward[]) => void
): () => void {
  const q = query(rewardsCol(householdId), orderBy('cost', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Reward, 'id'>) }))
    );
  });
}

/** מאזין לרשומות הפדיון של החשבון */
export function subscribeRedemptions(
  householdId: string,
  callback: (items: Redemption[]) => void
): () => void {
  return onSnapshot(redemptionsCol(householdId), (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Redemption, 'id'>),
      }))
    );
  });
}

interface RewardInput {
  title: string;
  cost: number;
  emoji?: string;
  active?: boolean;
}

/** יצירת פרס חדש בקטלוג */
export async function createReward(
  householdId: string,
  input: RewardInput,
  createdBy: string
): Promise<void> {
  await addDoc(rewardsCol(householdId), {
    title: input.title.trim(),
    cost: Math.max(0, Math.round(input.cost)),
    emoji: input.emoji?.trim() || '🎁',
    active: input.active ?? true,
    createdBy,
    createdAt: serverTimestamp(),
  });
}

/** עדכון פרס קיים */
export async function updateReward(
  householdId: string,
  rewardId: string,
  input: RewardInput
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'rewards', rewardId), {
    title: input.title.trim(),
    cost: Math.max(0, Math.round(input.cost)),
    emoji: input.emoji?.trim() || '🎁',
    active: input.active ?? true,
  });
}

/** מחיקת פרס מהקטלוג */
export async function deleteReward(
  householdId: string,
  rewardId: string
): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'rewards', rewardId));
}

interface RedeemTarget {
  id: string;
  name: string;
}

/** פדיון פרס: יוצר רשומת פדיון המנכה נקודות מהארנק של המשתמש */
export async function redeemReward(
  householdId: string,
  reward: Reward,
  forUser: RedeemTarget,
  by: RedeemTarget
): Promise<void> {
  await addDoc(redemptionsCol(householdId), {
    userId: forUser.id,
    userName: forUser.name,
    rewardId: reward.id,
    rewardTitle: reward.title,
    cost: reward.cost,
    byId: by.id,
    byName: by.name,
    at: serverTimestamp(),
  });
}

/** ביטול פדיון (החזרת הנקודות) */
export async function deleteRedemption(
  householdId: string,
  redemptionId: string
): Promise<void> {
  await deleteDoc(
    doc(db, 'households', householdId, 'redemptions', redemptionId)
  );
}

/**
 * חישוב יתרת הארנק לכל משתמש: סך הנקודות שנצברו אי־פעם (לפי מוטב)
 * פחות סך הנקודות שנפדו. ארנק זה אינו מושפע מאיפוס לוח המובילים.
 */
export function computeBalances(
  completions: Completion[],
  redemptions: Redemption[]
): Record<string, number> {
  const bal: Record<string, number> = {};
  for (const c of completions) {
    const uid = c.beneficiaryId ?? c.actorId;
    bal[uid] = (bal[uid] ?? 0) + (c.points ?? 0);
  }
  for (const r of redemptions) {
    bal[r.userId] = (bal[r.userId] ?? 0) - (r.cost ?? 0);
  }
  // הארנק לעולם אינו יורד מתחת לאפס (למשל אם משימה נפתחה מחדש אחרי פדיון)
  for (const uid of Object.keys(bal)) {
    if (bal[uid] < 0) bal[uid] = 0;
  }
  return bal;
}
