import type { Permissions, PermissionKey } from '../types';

/** תוויות בעברית לכל הרשאה + תיאור קצר */
export const PERMISSION_LABELS: Record<PermissionKey, { label: string; hint: string }> = {
  canCreateTasks: { label: 'יצירת משימות', hint: 'הוספת משימות חדשות' },
  canEditTasks: { label: 'עריכת משימות', hint: 'שינוי פרטי משימות קיימות' },
  canDeleteTasks: { label: 'מחיקת משימות', hint: 'הסרת משימות' },
  canAssignTasks: { label: 'שיוך אחראים', hint: 'קביעת מי אחראי על משימה' },
  canCompleteAnyTask: {
    label: 'סימון כל משימה כבוצעה',
    hint: 'אחרת: רק משימות שהוקצו לו',
  },
  canManageMembers: {
    label: 'ניהול בני המשפחה',
    hint: 'הזמנה, שינוי תפקידים והרשאות',
  },
  canResetPoints: {
    label: 'איפוס נקודות',
    hint: 'איפוס הניקוד והגדרת שיטת הספירה',
  },
};

export const PERMISSION_ORDER: PermissionKey[] = [
  'canCreateTasks',
  'canAssignTasks',
  'canEditTasks',
  'canCompleteAnyTask',
  'canDeleteTasks',
  'canManageMembers',
  'canResetPoints',
];

/** הרשאות מלאות (בעל החשבון) */
export const FULL_PERMISSIONS: Permissions = {
  canCreateTasks: true,
  canEditTasks: true,
  canDeleteTasks: true,
  canAssignTasks: true,
  canCompleteAnyTask: true,
  canManageMembers: true,
  canResetPoints: true,
};

/** ללא הרשאות כלל */
export const NO_PERMISSIONS: Permissions = {
  canCreateTasks: false,
  canEditTasks: false,
  canDeleteTasks: false,
  canAssignTasks: false,
  canCompleteAnyTask: false,
  canManageMembers: false,
  canResetPoints: false,
};

export interface PermissionPreset {
  id: string;
  label: string;
  role: string;
  position: string;
  permissions: Permissions;
}

/** תבניות מוכנות שהמנהל יכול לבחור ולהתאים */
export const PRESETS: PermissionPreset[] = [
  {
    id: 'admin',
    label: 'מנהל',
    role: 'מנהל',
    position: 'מנהל',
    permissions: { ...FULL_PERMISSIONS },
  },
  {
    id: 'adult',
    label: 'בן משפחה בוגר',
    role: 'בן משפחה',
    position: 'בוגר',
    permissions: {
      canCreateTasks: true,
      canEditTasks: true,
      canDeleteTasks: false,
      canAssignTasks: true,
      canCompleteAnyTask: true,
      canManageMembers: false,
      canResetPoints: false,
    },
  },
  {
    id: 'youth',
    label: 'ילד / נוער',
    role: 'ילד',
    position: 'נוער',
    permissions: {
      canCreateTasks: false,
      canEditTasks: false,
      canDeleteTasks: false,
      canAssignTasks: false,
      canCompleteAnyTask: false,
      canManageMembers: false,
      canResetPoints: false,
    },
  },
];

/**
 * בדיקה האם למשתמש יש הרשאה מסוימת.
 * בעל החשבון (isOwner) מקבל תמיד את כל ההרשאות.
 */
export function hasPermission(
  member: { permissions: Permissions; isOwner: boolean } | null | undefined,
  key: PermissionKey
): boolean {
  if (!member) return false;
  if (member.isOwner) return true;
  return !!member.permissions[key];
}

/** בדיקה האם המשתמש רשאי לסמן משימה מסוימת כבוצעה */
export function canCompleteTask(
  member: { userId: string; permissions: Permissions; isOwner: boolean } | null | undefined,
  assigneeIds: string[]
): boolean {
  if (!member) return false;
  if (member.isOwner || member.permissions.canCompleteAnyTask) return true;
  return assigneeIds.includes(member.userId);
}
