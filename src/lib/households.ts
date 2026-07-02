import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FULL_PERMISSIONS } from './permissions';
import type {
  AppUser,
  Household,
  Member,
  Membership,
  PointsPeriod,
} from '../types';

/** כתיבת רשומת חברות דנורמלית תחת המשתמש (למקור אמת של "החשבונות שלי") */
export async function writeMembership(
  uid: string,
  membership: Omit<Membership, 'joinedAt'>
): Promise<void> {
  const ref = doc(db, 'users', uid, 'memberships', membership.householdId);
  await setDoc(ref, { ...membership, joinedAt: serverTimestamp() });
}

/** יצירת/עדכון מסמך המשתמש הגלובלי */
export async function upsertUser(user: AppUser): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const existing = await getDoc(ref);
  const base: Record<string, unknown> = {
    email: user.email,
    displayName: user.displayName,
  };
  if (user.phone !== undefined) base.phone = user.phone;
  if (existing.exists()) {
    await setDoc(ref, base, { merge: true });
  } else {
    await setDoc(ref, { ...base, createdAt: serverTimestamp() });
  }
}

/** שליפת מספר הטלפון השמור של המשתמש (לצורך אימות הזמנה) */
export async function getUserPhone(uid: string): Promise<string> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return '';
  return (snap.data().phone as string | undefined) ?? '';
}

/**
 * יצירת חשבון משפחתי חדש. יוצר המסמך הופך לבעל החשבון (owner)
 * עם הרשאות מלאות. מחזיר את מזהה החשבון.
 */
export async function createHousehold(
  name: string,
  owner: AppUser
): Promise<string> {
  const householdRef = doc(collection(db, 'households'));
  await setDoc(householdRef, {
    name: name.trim(),
    ownerId: owner.uid,
    createdAt: serverTimestamp(),
  });

  const role = 'מנהל המשפחה';
  const position = 'בעל החשבון';

  const memberRef = doc(db, 'households', householdRef.id, 'members', owner.uid);
  await setDoc(memberRef, {
    userId: owner.uid,
    displayName: owner.displayName,
    email: owner.email.toLowerCase(),
    role,
    position,
    permissions: FULL_PERMISSIONS,
    isOwner: true,
    joinedAt: serverTimestamp(),
  });

  // רשומת חברות תחת המשתמש - מקור האמת לרשימת "החשבונות שלי"
  await writeMembership(owner.uid, {
    householdId: householdRef.id,
    householdName: name.trim(),
    role,
    position,
    isOwner: true,
  });

  return householdRef.id;
}

/**
 * שליפת כל החשבונות שהמשתמש חבר בהם - קריאה ישירה של
 * users/{uid}/memberships (ללא collectionGroup, ללא אינדקסים מיוחדים).
 */
export async function getUserHouseholds(uid: string): Promise<Household[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'memberships'));

  const households: Household[] = [];
  for (const m of snap.docs) {
    const data = m.data() as Membership;
    const hSnap = await getDoc(doc(db, 'households', data.householdId));
    if (hSnap.exists()) {
      households.push({ id: hSnap.id, ...(hSnap.data() as Omit<Household, 'id'>) });
    } else {
      // גיבוי: אם מסמך החשבון לא נגיש, נשתמש בנתונים הדנורמליים
      households.push({
        id: data.householdId,
        name: data.householdName,
        ownerId: data.isOwner ? uid : '',
      });
    }
  }
  return households;
}

/** עדכון שיטת ספירת הנקודות של החשבון */
export async function setPointsPeriod(
  householdId: string,
  period: PointsPeriod
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { pointsPeriod: period });
}

/** איפוס נקודות מעכשיו (שומר היסטוריה - רק מסמן מועד איפוס) */
export async function resetPointsNow(householdId: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), {
    pointsResetAt: serverTimestamp(),
  });
}

/** מאזין בזמן אמת למסמך החשבון (לשיטת נקודות ומועד איפוס) */
export function subscribeHousehold(
  householdId: string,
  callback: (household: Household | null) => void
): () => void {
  return onSnapshot(doc(db, 'households', householdId), (snap) => {
    callback(
      snap.exists()
        ? { id: snap.id, ...(snap.data() as Omit<Household, 'id'>) }
        : null
    );
  });
}

/** שליפת מסמך החבר של המשתמש בחשבון מסוים */
export async function getMember(
  householdId: string,
  uid: string
): Promise<Member | null> {
  const ref = doc(db, 'households', householdId, 'members', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Member;
}
