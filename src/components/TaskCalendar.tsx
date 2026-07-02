import { useMemo, useState } from 'react';
import { TaskCard } from './TaskCard';
import type { Task } from '../types';

const DAY_HEADERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function TaskCalendar({
  tasks,
  onInfo,
  onEdit,
}: {
  tasks: Task[];
  onInfo: (t: Task) => void;
  onEdit: (t: Task) => void;
}) {
  const today = new Date();
  const [month, setMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selected, setSelected] = useState<Date>(today);

  // מיפוי משימות לפי יום היעד
  const byDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const key = ymd(t.dueDate.toDate());
      (map[key] ??= []).push(t);
    }
    return map;
  }, [tasks]);

  const firstWeekday = month.getDay();
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  }

  const monthLabel = new Intl.DateTimeFormat('he-IL', {
    month: 'long',
    year: 'numeric',
  }).format(month);

  const selectedTasks = byDay[ymd(selected)] ?? [];

  function shiftMonth(delta: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  return (
    <div>
      <div className="cal-nav">
        <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="חודש הבא">
          ›
        </button>
        <span className="cal-month">{monthLabel}</span>
        <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="חודש קודם">
          ‹
        </button>
      </div>

      <div className="cal-grid cal-head">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="cal-dow">
            {h}
          </div>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={`b${i}`} className="cal-cell empty" />;
          const key = ymd(d);
          const dayTasks = byDay[key] ?? [];
          const isToday = ymd(today) === key;
          const isSelected = ymd(selected) === key;
          const hasOverdueOpen = dayTasks.some(
            (t) => t.status === 'open'
          );
          return (
            <button
              key={key}
              className={`cal-cell${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
              onClick={() => setSelected(d)}
            >
              <span className="cal-num">{d.getDate()}</span>
              {dayTasks.length > 0 && (
                <span
                  className="cal-dot"
                  style={{
                    background: hasOverdueOpen
                      ? 'var(--primary)'
                      : 'var(--success)',
                  }}
                >
                  {dayTasks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="section-header" style={{ marginTop: '1rem' }}>
        <h2 style={{ fontSize: '0.95rem' }}>
          {new Intl.DateTimeFormat('he-IL', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
          }).format(selected)}
        </h2>
      </div>

      {selectedTasks.length === 0 ? (
        <div className="empty-state" style={{ padding: '1.5rem' }}>
          אין משימות ליום זה
        </div>
      ) : (
        selectedTasks.map((t) => (
          <TaskCard key={t.id} task={t} onInfo={onInfo} onEdit={onEdit} />
        ))
      )}
    </div>
  );
}
