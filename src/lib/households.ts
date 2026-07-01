import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FULL_PERMISSIONS } from './permissions';
import type { AppUser, Household, Member } from '../types';

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

  const memberRef = doc(db, 'households', householdRef.id, 'members', owner.uid);
  await setDoc(memberRef, {
    userId: owner.uid,
    displayName: owner.displayName,
    email: owner.email.toLowerCase(),
    role: 'מנהל המשפחה',
    position: 'בעל החשבון',
    permissions: FULL_PERMISSIONS,
    isOwner: true,
    joinedAt: serverTimestamp(),
  });

  return householdRef.id;
}

/** שליפת כל החשבונות שהמשתמש חבר בהם (דרך collectionGroup על members) */
export async function getUserHouseholds(uid: string): Promise<Household[]> {
  // שאילתה על כל מסמכי החברים של המשתמש בעזרת collectionGroup
  const membersQuery = query(
    collectionGroup(db, 'members'),
    where('userId', '==', uid)
  );
  const snap = await getDocs(membersQuery);

  const households: Household[] = [];
  for (const memberDoc of snap.docs) {
    const householdRef = memberDoc.ref.parent.parent;
    if (!householdRef) continue;
    const hSnap = await getDoc(householdRef);
    if (hSnap.exists()) {
      households.push({ id: hSnap.id, ...(hSnap.data() as Omit<Household, 'id'>) });
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
