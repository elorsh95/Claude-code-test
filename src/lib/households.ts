import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FULL_PERMISSIONS } from './permissions';
import type { AppUser, Household, Member, Membership } from '../types';

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
  if (existing.exists()) {
    await setDoc(
      ref,
      { email: user.email, displayName: user.displayName },
      { merge: true }
    );
  } else {
    await setDoc(ref, {
      email: user.email,
      displayName: user.displayName,
      createdAt: serverTimestamp(),
    });
  }
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
