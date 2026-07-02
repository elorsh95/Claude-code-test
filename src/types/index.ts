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
  /** איפוס נקודות (והגדרת שיטת ספירה) */
  canResetPoints: boolean;
}

/** שיטת ספירת הנקודות */
export type PointsPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

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
  /** שיטת ספירת הנקודות (ברירת מחדל: שבועי) */
  pointsPeriod?: PointsPeriod;
  /** מועד איפוס נקודות ידני אחרון (נקודות נספרות אחריו) */
  pointsResetAt?: Timestamp | null;
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

/** תדירות חזרה של משימה */
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

/** עדיפות משימה */
export type TaskPriority = 'low' | 'normal' | 'high';

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
  /** תאריך יעד (אופציונלי) */
  dueDate?: Timestamp | null;
  /** תדירות חזרה */
  recurrence?: RecurrenceType;
  /** ניקוד שמוענק על ביצוע */
  points?: number;
  /** עדיפות (ברירת מחדל: רגיל) */
  priority?: TaskPriority;
}

/** רשומת ביצוע - לצבירת נקודות (עובד גם למשימות חוזרות) */
export interface Completion {
  id: string;
  taskId: string;
  taskTitle: string;
  /** מי שסימן את המשימה כבוצעה */
  actorId: string;
  actorName: string;
  /** מי שמקבל את הנקודות (ברירת מחדל: האחראי/המבצע) */
  beneficiaryId: string;
  beneficiaryName: string;
  points: number;
  at?: Timestamp;
}

/** פרס בחנות הפרסים - נפדה בנקודות שנצברו */
export interface Reward {
  id: string;
  title: string;
  /** עלות בנקודות */
  cost: number;
  /** אימוג'י לתצוגה (אופציונלי) */
  emoji?: string;
  /** האם הפרס פעיל וזמין לפדיון */
  active: boolean;
  createdBy: string;
  createdAt?: Timestamp;
}

/** רשומת פדיון פרס - מנכה נקודות מהארנק של המשתמש */
export interface Redemption {
  id: string;
  /** מי שקיבל את הפרס (ומנוכות לו הנקודות) */
  userId: string;
  userName: string;
  rewardId: string;
  rewardTitle: string;
  /** עלות בנקודות שנוכתה */
  cost: number;
  /** מי שביצע את הפדיון בפועל */
  byId: string;
  byName: string;
  at?: Timestamp;
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
  /** טביעת אצבע (SHA-256) של הערך המנורמל - משמשת לאימות ההתאמה */
  contactHash: string;
  /** גרסה ממוסכת (למשל "···4567") - להצגה בהקשרים לא-ניהוליים */
  contactMasked: string;
  /** הערך המלא כפי שהוזן - לתצוגת המנהל בלבד; לעולם לא מוצג למוזמן */
  contactDisplay: string;
  role: string;
  position: string;
  permissions: Permissions;
  status: InvitationStatus;
  invitedBy: string;
  invitedByName: string;
  createdAt?: Timestamp;
}
