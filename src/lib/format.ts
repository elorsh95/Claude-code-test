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

/** ראשי תיבות משם לתצוגת אווטאר */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
