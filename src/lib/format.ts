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

/** ראשי תיבות משם לתצוגת אווטאר */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
