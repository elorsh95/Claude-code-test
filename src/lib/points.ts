import type { PointsPeriod } from '../types';

export const PERIOD_LABELS: Record<PointsPeriod, string> = {
  daily: 'יומי',
  weekly: 'שבועי',
  monthly: 'חודשי',
  all: 'כל הזמן',
};

/** תחילת התקופה שאליה שייך התאריך הנתון (חצות) */
export function periodStart(date: Date, period: PointsPeriod): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (period === 'daily') return d;
  if (period === 'weekly') {
    // שבוע מתחיל ביום ראשון (getDay: ראשון=0) - מתאפס במוצ"ש
    d.setDate(d.getDate() - d.getDay());
    return d;
  }
  if (period === 'monthly') {
    d.setDate(1);
    return d;
  }
  return new Date(0); // all
}

/** תחילת התקופה הבאה (סוף התקופה הנוכחית, לא כולל) */
export function periodEnd(date: Date, period: PointsPeriod): Date {
  const start = periodStart(date, period);
  const d = new Date(start);
  if (period === 'daily') d.setDate(d.getDate() + 1);
  else if (period === 'weekly') d.setDate(d.getDate() + 7);
  else if (period === 'monthly') d.setMonth(d.getMonth() + 1);
  else return new Date(8640000000000000); // all - סוף רחוק
  return d;
}

/** האם התאריך נמצא בתקופה הנוכחית (זו שמכילה את "עכשיו") */
export function isCurrentPeriod(
  date: Date,
  period: PointsPeriod,
  now: Date
): boolean {
  return periodStart(date, period).getTime() === periodStart(now, period).getTime();
}

/** תיאור קריא של טווח התקופה שאליה שייך התאריך */
export function periodRangeLabel(date: Date, period: PointsPeriod): string {
  if (period === 'all') return 'כל הזמן';
  const s = periodStart(date, period);
  const e = new Date(periodEnd(date, period).getTime() - 1);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit' }).format(d);
  if (period === 'daily') return fmt(s);
  return `${fmt(s)} – ${fmt(e)}`;
}
