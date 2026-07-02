import type { Timestamp } from 'firebase/firestore';
import type { RecurrenceType } from '../types';

/**
 * עוטף הבטחה בטיימאאוט - כדי שפעולה תקועה (למשל רשת איטית) תציג
 * שגיאה ברורה במקום ספינר אינסופי.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms = 25000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('timeout'));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/** המרת חותמת זמן של Firestore לתאריך קריא בעברית */
export function formatDateTime(ts?: Timestamp | null): string {
  if (!ts) return '';
  const date = ts.toDate();
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * נרמול מספר טלפון להשוואה: ספרות בלבד, ללא קידומת מדינה (972) ואפס מוביל.
 * למשל "054-123-4567", "+972 54 1234567" → "541234567".
 */
export function normalizePhone(phone: string): string {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('972')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
}

/**
 * מיסוך אמצעי קשר לתצוגת המנהל בלבד (הערך המלא אינו נשמר).
 * מייל: "ab***@gmail.com" · טלפון: "···4567"
 */
export function maskContact(
  type: 'email' | 'phone',
  display: string,
  normalized: string
): string {
  if (type === 'phone') {
    const last4 = normalized.slice(-4);
    return last4 ? `···${last4}` : '···';
  }
  const at = display.indexOf('@');
  if (at <= 0) return '***';
  const local = display.slice(0, at);
  const domain = display.slice(at + 1);
  const shown = local.length <= 1 ? local[0] : local.slice(0, 2);
  return `${shown}***@${domain}`;
}

/** תאריך בלבד (ללא שעה) בעברית */
export function formatDate(ts?: Timestamp | null): string {
  if (!ts) return '';
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(ts.toDate());
}

/** תחילת היום (חצות) של תאריך נתון */
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** האם תאריך היעד עבר (לפני היום) */
export function isOverdue(ts?: Timestamp | null): boolean {
  if (!ts) return false;
  return startOfDay(ts.toDate()) < startOfDay(new Date());
}

/** האם תאריך היעד הוא היום */
export function isDueToday(ts?: Timestamp | null): boolean {
  if (!ts) return false;
  return startOfDay(ts.toDate()).getTime() === startOfDay(new Date()).getTime();
}

/** תאריך היעד הבא לפי תדירות החזרה */
export function nextDueDate(from: Date, recurrence: RecurrenceType): Date {
  const d = new Date(from);
  if (recurrence === 'daily') d.setDate(d.getDate() + 1);
  else if (recurrence === 'weekly') d.setDate(d.getDate() + 7);
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
  return d;
}

/** המרת ערך של input[type=date] (YYYY-MM-DD) לאובייקט Date, או null */
export function dateInputToDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0); // צהריים כדי להימנע מבעיות אזור זמן
}

/** המרת Timestamp לערך input[type=date] (YYYY-MM-DD) */
export function dateToInputValue(ts?: Timestamp | null): string {
  if (!ts) return '';
  const d = ts.toDate();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** ראשי תיבות משם לתצוגת אווטאר */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
