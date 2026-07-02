import type { Timestamp } from 'firebase/firestore';

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

/** ראשי תיבות משם לתצוגת אווטאר */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
