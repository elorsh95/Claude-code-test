import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { writeMembership } from './households';
import type {
  AppUser,
  ContactType,
  Invitation,
  Member,
  Permissions,
} from '../types';

interface CreateInviteInput {
  householdId: string;
  householdName: string;
  contactType: ContactType;
  contactValue: string; // מנורמל (מייל lowercase / טלפון ספרות)
  contactDisplay: string; // הערך המקורי שהוזן
  role: string;
  position: string;
  permissions: Permissions;
  invitedBy: string;
  invitedByName: string;
}

/**
 * יצירת קישור הזמנה חדש, נעול לאיש ספציפי לפי מייל או טלפון.
 * מחזיר את מזהה ההזמנה, שממנו נבנה הקישור לשיתוף.
 */
export async function createInvitation(
  input: CreateInviteInput
): Promise<string> {
  const ref = await addDoc(collection(db, 'invitations'), {
    householdId: input.householdId,
    householdName: input.householdName,
    contactType: input.contactType,
    contactValue: input.contactValue,
    contactDisplay: input.contactDisplay,
    role: input.role,
    position: input.position,
    permissions: input.permissions,
    status: 'pending',
    invitedBy: input.invitedBy,
    invitedByName: input.invitedByName,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** בניית קישור הזמנה לשיתוף מתוך מזהה ההזמנה */
export function buildInviteLink(inviteId: string): string {
  return `${window.location.origin}/join/${inviteId}`;
}

/** שליפת הזמנה בודדת לפי מזהה (לעמוד ההצטרפות) */
export async function getInvitation(
  inviteId: string
): Promise<Invitation | null> {
  const snap = await getDoc(doc(db, 'invitations', inviteId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Invitation, 'id'>) };
}

/** מאזין להזמנות הממתינות של המשתמש הנוכחי (לפי אימייל) */
export function subscribePendingInvitations(
  email: string,
  callback: (invites: Invitation[]) => void
): () => void {
  // הזמנות המייל של המשתמש: שאילתת שדה-יחיד (contactValue) + סינון בקוד
  const q = query(
    collection(db, 'invitations'),
    where('contactValue', '==', email.toLowerCase())
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Invitation, 'id'>) }))
        .filter((inv) => inv.contactType === 'email' && inv.status === 'pending')
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
