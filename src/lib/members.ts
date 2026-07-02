import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Member, Permissions } from '../types';

/** מאזין בזמן אמת לרשימת החברים בחשבון */
export function subscribeMembers(
  householdId: string,
  callback: (members: Member[]) => void
): () => void {
  const q = query(
    collection(db, 'households', householdId, 'members'),
    orderBy('joinedAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as Member));
  });
}

/** עדכון תפקיד, מעמד והרשאות של חבר */
export async function updateMember(
  householdId: string,
  userId: string,
  data: { role: string; position: string; permissions: Permissions }
): Promise<void> {
  const ref = doc(db, 'households', householdId, 'members', userId);
  await updateDoc(ref, {
    role: data.role,
    position: data.position,
    permissions: data.permissions,
  });
}

/** עדכון שם התצוגה של חבר */
export async function updateMemberName(
  householdId: string,
  userId: string,
  displayName: string
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'members', userId), {
    displayName: displayName.trim(),
  });
}

/** הסרת חבר מהחשבון (כולל רשומת החברות הפרטית שלו) */
export async function removeMember(
  householdId: string,
  userId: string
): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'members', userId));
  // מחיקת רשומת החברות הדנורמלית תחת המשתמש
  await deleteDoc(doc(db, 'users', userId, 'memberships', householdId)).catch(
    () => {
      /* ייתכן שאין הרשאה למחוק תת-אוסף של משתמש אחר - לא קריטי */
    }
  );
}
