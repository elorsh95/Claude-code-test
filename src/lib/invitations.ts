import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { writeMembership } from './households';
import type { AppUser, Invitation, Member, Permissions } from '../types';

interface CreateInviteInput {
  householdId: string;
  householdName: string;
  email: string;
  role: string;
  position: string;
  permissions: Permissions;
  invitedBy: string;
  invitedByName: string;
}

/** יצירת הזמנה חדשה לחבר משפחה (לפי אימייל) */
export async function createInvitation(input: CreateInviteInput): Promise<void> {
  const email = input.email.trim().toLowerCase();

  // מניעת כפילויות: שאילתת שדה-יחיד (householdId) + סינון בקוד - ללא אינדקס מורכב
  const existing = await getDocs(
    query(
      collection(db, 'invitations'),
      where('householdId', '==', input.householdId)
    )
  );
  const dup = existing.docs.some((d) => {
    const data = d.data() as Invitation;
    return data.email === email && data.status === 'pending';
  });
  if (dup) {
    throw new Error('כבר קיימת הזמנה ממתינה לאימייל הזה');
  }

  await addDoc(collection(db, 'invitations'), {
    householdId: input.householdId,
    householdName: input.householdName,
    email,
    role: input.role,
    position: input.position,
    permissions: input.permissions,
    status: 'pending',
    invitedBy: input.invitedBy,
    invitedByName: input.invitedByName,
    createdAt: serverTimestamp(),
  });
}

/** מאזין להזמנות הממתינות של המשתמש הנוכחי (לפי אימייל) */
export function subscribePendingInvitations(
  email: string,
  callback: (invites: Invitation[]) => void
): () => void {
  // שאילתת שדה-יחיד (email) + סינון pending בקוד - ללא אינדקס מורכב
  const q = query(
    collection(db, 'invitations'),
    where('email', '==', email.toLowerCase())
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Invitation, 'id'>) }))
        .filter((inv) => inv.status === 'pending')
    );
  });
}

/** מאזין להזמנות הממתינות של חשבון מסוים (לתצוגת המנהל) */
export function subscribeHouseholdInvitations(
  householdId: string,
  callback: (invites: Invitation[]) => void
): () => void {
  // שאילתת שדה-יחיד (householdId) + סינון pending בקוד - ללא אינדקס מורכב
  const q = query(
    collection(db, 'invitations'),
    where('householdId', '==', householdId)
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Invitation, 'id'>) }))
        .filter((inv) => inv.status === 'pending')
    );
  });
}

/** קבלת הזמנה: יוצר את מסמך החבר ומסמן את ההזמנה כמקובלת */
export async function acceptInvitation(
  invite: Invitation,
  user: AppUser
): Promise<void> {
  const memberRef = doc(
    db,
    'households',
    invite.householdId,
    'members',
    user.uid
  );
  const member: Omit<Member, 'joinedAt'> = {
    userId: user.uid,
    displayName: user.displayName,
    email: user.email.toLowerCase(),
    role: invite.role,
    position: invite.position,
    permissions: invite.permissions,
    isOwner: false,
    invitedBy: invite.invitedBy,
  };
  await setDoc(memberRef, { ...member, joinedAt: serverTimestamp() });

  // רשומת חברות תחת המשתמש - מקור האמת לרשימת "החשבונות שלי"
  await writeMembership(user.uid, {
    householdId: invite.householdId,
    householdName: invite.householdName,
    role: invite.role,
    position: invite.position,
    isOwner: false,
  });

  await updateDoc(doc(db, 'invitations', invite.id), { status: 'accepted' });
}

/** דחיית הזמנה */
export async function declineInvitation(inviteId: string): Promise<void> {
  await updateDoc(doc(db, 'invitations', inviteId), { status: 'declined' });
}

/** ביטול הזמנה על ידי המנהל */
export async function cancelInvitation(inviteId: string): Promise<void> {
  await deleteDoc(doc(db, 'invitations', inviteId));
}
