import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useHousehold } from '../contexts/HouseholdContext';
import { subscribeTaskHistory } from '../lib/tasks';
import { formatDateTime } from '../lib/format';
import type { HistoryEventType, Task, TaskHistoryEvent } from '../types';

const EVENT_META: Record<HistoryEventType, { icon: string; label: string }> = {
  created: { icon: '➕', label: 'נוצרה' },
  assigned: { icon: '👤', label: 'שיוך אחראים' },
  updated: { icon: '✏️', label: 'עודכנה' },
  completed: { icon: '✅', label: 'בוצעה' },
  reopened: { icon: '↩️', label: 'נפתחה מחדש' },
};

export function TaskInfoModal({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const { activeHousehold, members } = useHousehold();
  const [events, setEvents] = useState<TaskHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeHousehold) return;
    const unsub = subscribeTaskHistory(activeHousehold.id, task.id, (evts) => {
      setEvents(evts);
      setLoading(false);
    });
    return unsub;
  }, [activeHousehold, task.id]);

  const assigneeNames = task.assigneeIds
    .map((id) => members.find((m) => m.userId === id)?.displayName)
    .filter(Boolean)
    .join(', ');

  return (
    <Modal title="פרטי המשימה" onClose={onClose}>
      <div className="task-title" style={{ fontSize: '1.1rem' }}>
        {task.title}
      </div>
      {task.description && (
        <p className="task-desc" style={{ marginBottom: '0.5rem' }}>
          {task.description}
        </p>
      )}
      <div className="task-meta" style={{ marginBottom: '1.2rem' }}>
        <span className={`chip ${task.status === 'done' ? '' : 'muted'}`}>
          {task.status === 'done' ? '✅ בוצעה' : '⏳ פתוחה'}
        </span>
        {assigneeNames && <span className="chip">👤 {assigneeNames}</span>}
      </div>

      <h4 style={{ marginBottom: '0.8rem', fontSize: '0.95rem' }}>
        היסטוריית המשימה
      </h4>

      {loading ? (
        <div className="spinner" style={{ margin: '1rem auto' }} />
      ) : events.length === 0 ? (
        <p className="empty-state">אין אירועים עדיין</p>
      ) : (
        <ul className="timeline">
          {events.map((ev) => {
            const meta = EVENT_META[ev.type];
            return (
              <li key={ev.id}>
                <div className="tl-text">
                  {meta.icon} {meta.label} · {ev.actorName}
                </div>
                {ev.details && (
                  <div className="tl-time">{ev.details}</div>
                )}
                <div className="tl-time">{formatDateTime(ev.timestamp)}</div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
