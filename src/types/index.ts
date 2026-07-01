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
  createdAt?: Timestamp;
}

/** חשבון משפחתי */
export interface Household {
  id: string;
  name: string;
  ownerId: string;
  createdAt?: Timestamp;
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

/** הזמנה להצטרף לחשבון משפחתי */
export interface Invitation {
  id: string;
  householdId: string;
  householdName: string;
  email: string;
  role: string;
  position: string;
  permissions: Permissions;
  status: InvitationStatus;
  invitedBy: string;
  invitedByName: string;
  createdAt?: Timestamp;
}
