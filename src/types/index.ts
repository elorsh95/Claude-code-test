import type { Timestamp } from 'firebase/firestore';

/** הרשאות שניתן להגדיר לכל חבר משפחה */
export interface Permissions {
  canCreateTasks: boolean;
  canEditTasks: boolean;
  canDeleteTasks: boolean;
  canAssignTasks: boolean;
  /** true = יכול לסמן כל משימה כבוצעה; false = רק משימות שהוקצו לו */
  canCompleteAnyTask: boolean;
  /** ניהול חברי המשפחה: הזמנה, עריכת תפקיד/הרשאות, הסרה */
  canManageMembers: boolean;
}

export type PermissionKey = keyof Permissions;

/** מסמך משתמש גלובלי */
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  createdAt?: Timestamp;
}

/** חשבון משפחתי */
export interface Household {
  id: string;
  name: string;
  ownerId: string;
  createdAt?: Timestamp;
}

/** רשומת חברות דנורמלית תחת המשתמש: users/{uid}/memberships/{householdId} */
export interface Membership {
  householdId: string;
  householdName: string;
  role: string;
  position: string;
  isOwner: boolean;
  joinedAt?: Timestamp;
}

/** חבר בתוך חשבון משפחתי */
export interface Member {
  userId: string;
  displayName: string;
  email: string;
  /** תפקיד חופשי, למשל "אמא", "אבא", "ילד" */
  role: string;
  /** מעמד חופשי, למשל "מנהל", "בוגר", "נוער" */
  position: string;
  permissions: Permissions;
  isOwner: boolean;
  invitedBy?: string;
  joinedAt?: Timestamp;
}

export type TaskStatus = 'open' | 'done';

/** משימה */
export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeIds: string[];
  status: TaskStatus;
  createdBy: string;
  createdAt?: Timestamp;
  completedBy?: string | null;
  completedAt?: Timestamp | null;
}

export type HistoryEventType =
  | 'created'
  | 'assigned'
  | 'updated'
  | 'completed'
  | 'reopened';

/** אירוע בהיסטוריית משימה */
export interface TaskHistoryEvent {
  id: string;
  type: HistoryEventType;
  actorId: string;
  actorName: string;
  details?: string;
  timestamp?: Timestamp;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined';

/** אמצעי הקשר שאליו נעולה ההזמנה */
export type ContactType = 'email' | 'phone';

/** הזמנה להצטרף לחשבון משפחתי (נעולה לאיש ספציפי לפי מייל/טלפון) */
export interface Invitation {
  id: string;
  householdId: string;
  householdName: string;
  /** סוג אמצעי הקשר שאליו ההזמנה נעולה */
  contactType: ContactType;
  /** טביעת אצבע (SHA-256) של הערך המנורמל - הערך המלא אינו נשמר */
  contactHash: string;
  /** גרסה ממוסכת לתצוגת המנהל בלבד (למשל "···4567") */
  contactMasked: string;
  role: string;
  position: string;
  permissions: Permissions;
  status: InvitationStatus;
  invitedBy: string;
  invitedByName: string;
  createdAt?: Timestamp;
}
