import { useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { createTask, deleteTask, updateTask } from '../lib/tasks';
import { hasPermission } from '../lib/permissions';
import { dateInputToDate, dateToInputValue } from '../lib/format';
import type { RecurrenceType, Task, TaskPriority } from '../types';

interface Props {
  task?: Task | null;
  onClose: () => void;
}

export function TaskFormModal({ task, onClose }: Props) {
  const { user } = useAuth();
  const { activeHousehold, members, currentMember } = useHousehold();
  const isEdit = !!task;
  const canAssign = hasPermission(currentMember, 'canAssignTasks');
  const canDelete = hasPermission(currentMember, 'canDeleteTasks');

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task?.assigneeIds ?? []
  );
  const [dueDate, setDueDate] = useState(dateToInputValue(task?.dueDate));
  const [recurrence, setRecurrence] = useState<RecurrenceType>(
    task?.recurrence ?? 'none'
  );
  const [points, setPoints] = useState(String(task?.points ?? 0));
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? 'normal'
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // אזור "אפשרויות נוספות" מתקפל - נפתח אוטומטית בעריכה אם כבר הוגדרו ערכים בו
  const [showAdvanced, setShowAdvanced] = useState(
    !!(
      task?.dueDate ||
      task?.description ||
      (task?.priority && task.priority !== 'normal') ||
      (task?.recurrence && task.recurrence !== 'none')
    )
  );

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function namesFor(ids: string[]): string[] {
    return ids
      .map((id) => members.find((m) => m.userId === id)?.displayName)
      .filter((n): n is string => !!n);
  }

  async function handleDelete() {
    if (!activeHousehold || !task) return;
    if (!confirm('למחוק את המשימה? פעולה זו אינה הפיכה.')) return;
    setBusy(true);
    setError('');
    try {
      await deleteTask(activeHousehold.id, task.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת המשימה');
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !activeHousehold || !title.trim()) return;
    setBusy(true);
    setError('');
    const actor = { uid: user.uid, displayName: user.displayName };
    const due = dateInputToDate(dueDate);
    const pts = Math.max(0, parseInt(points, 10) || 0);
    try {
      if (isEdit && task) {
        const changed =
          JSON.stringify([...assigneeIds].sort()) !==
          JSON.stringify([...task.assigneeIds].sort());
        await updateTask(
          activeHousehold.id,
          task.id,
          {
            title,
            description,
            assigneeIds,
            assigneeNames: namesFor(assigneeIds),
            assigneesChanged: changed,
            dueDate: due,
            recurrence,
            points: pts,
            priority,
          },
          actor
        );
      } else {
        await createTask(
          activeHousehold.id,
          {
            title,
            description,
            assigneeIds,
            assigneeNames: namesFor(assigneeIds),
            dueDate: due,
            recurrence,
            points: pts,
            priority,
          },
          actor
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת המשימה');
      setBusy(false);
    }
  }

  return (
    <Modal title={isEdit ? 'עריכת משימה' : 'משימה חדשה'} onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="title">כותרת</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="למשל: להוציא את הזבל"
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label>אחראים על המשימה</label>
          {!canAssign && (
            <div className="info-banner">
              אין לך הרשאה לשייך אחראים. ניתן ליצור משימה ללא שיוך.
            </div>
          )}
          <div className="checkbox-list">
            {members.map((m) => (
              <label className="checkbox-item" key={m.userId}>
                <input
                  type="checkbox"
                  checked={assigneeIds.includes(m.userId)}
                  onChange={() => toggleAssignee(m.userId)}
                  disabled={!canAssign}
                />
                <span>
                  {m.displayName}
                  {m.role ? ` · ${m.role}` : ''}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="points">נקודות על ביצוע</label>
          <input
            id="points"
            type="number"
            min="0"
            inputMode="numeric"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </div>

        {/* אפשרויות נוספות - מתקפל */}
        <button
          type="button"
          className="advanced-toggle"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          <span className={`chevron ${showAdvanced ? 'open' : ''}`}>▸</span>
          אפשרויות נוספות (תאריך יעד, תיאור, עדיפות, חזרתיות)
        </button>

        {showAdvanced && (
          <div className="advanced-section">
            <div className="field">
              <label htmlFor="due">תאריך יעד (אופציונלי)</label>
              <input
                id="due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="desc">תיאור (אופציונלי)</label>
              <textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="פרטים נוספים…"
              />
            </div>

            <div className="field">
              <label htmlFor="priority">עדיפות</label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="high">דחוף</option>
                <option value="normal">רגיל</option>
                <option value="low">נמוך</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="recurrence">חזרתיות</label>
              <select
                id="recurrence"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              >
                <option value="none">חד-פעמי</option>
                <option value="daily">כל יום</option>
                <option value="weekly">כל שבוע</option>
                <option value="monthly">כל חודש</option>
              </select>
              {recurrence !== 'none' && (
                <div className="member-sub" style={{ marginTop: '0.35rem' }}>
                  בכל ביצוע, תאריך היעד יתגלגל אוטומטית למחזור הבא.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn" type="submit" disabled={busy || !title.trim()}>
            {isEdit ? 'שמירה' : 'יצירה'}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            ביטול
          </button>
        </div>

        {isEdit && canDelete && (
          <button
            className="btn btn-danger btn-block"
            type="button"
            onClick={handleDelete}
            disabled={busy}
            style={{ marginTop: '0.6rem' }}
          >
            מחיקת המשימה
          </button>
        )}
      </form>
    </Modal>
  );
}
