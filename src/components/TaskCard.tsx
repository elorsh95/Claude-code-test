import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { setTaskDone, type Beneficiary } from '../lib/tasks';
import { canCompleteTask, hasPermission } from '../lib/permissions';
import { formatDate, isDueToday, isOverdue } from '../lib/format';
import { BeneficiaryModal } from './BeneficiaryModal';
import type { RecurrenceType, Task } from '../types';

interface Props {
  task: Task;
  onInfo: (task: Task) => void;
  onEdit: (task: Task) => void;
}

const RECURRENCE_LABEL: Record<RecurrenceType, string> = {
  none: '',
  daily: 'יומי',
  weekly: 'שבועי',
  monthly: 'חודשי',
};

export function TaskCard({ task, onInfo, onEdit }: Props) {
  const { user } = useAuth();
  const { activeHousehold, members, currentMember } = useHousehold();

  const isDone = task.status === 'done';
  const canComplete = canCompleteTask(currentMember, task.assigneeIds);
  const canEdit = hasPermission(currentMember, 'canEditTasks');

  const assignees = task.assigneeIds
    .map((id) => members.find((m) => m.userId === id))
    .filter(Boolean);

  const completerName = isDone
    ? members.find((m) => m.userId === task.completedBy)?.displayName
    : undefined;

  const recurrence = (task.recurrence ?? 'none') as RecurrenceType;
  const overdue = !isDone && isOverdue(task.dueDate);
  const dueToday = !isDone && isDueToday(task.dueDate);
  const points = task.points ?? 0;

  const [showChooser, setShowChooser] = useState(false);

  async function complete(beneficiary: Beneficiary | undefined) {
    if (!user || !activeHousehold) return;
    await setTaskDone(
      activeHousehold.id,
      task.id,
      true,
      { uid: user.uid, displayName: user.displayName },
      task,
      beneficiary
    );
  }

  async function toggle() {
    if (!user || !activeHousehold || !canComplete) return;

    // פתיחה מחדש - ללא מוטב (הנקודות יופחתו)
    if (isDone) {
      await setTaskDone(
        activeHousehold.id,
        task.id,
        false,
        { uid: user.uid, displayName: user.displayName },
        task
      );
      return;
    }

    // סימון כבוצעה - קביעת מי מקבל את הנקודות
    const assignees = task.assigneeIds;
    if (assignees.length > 1) {
      // כמה אחראים - תמיד מאפשרים לבחור למי לזקוף (גם אם המסמן אחד מהם)
      setShowChooser(true);
      return;
    }
    if (assignees.length === 1) {
      // אחראי יחיד - הנקודות שלו (גם אם מישהו אחר סימן)
      const m = members.find((x) => x.userId === assignees[0]);
      await complete({ id: assignees[0], name: m?.displayName ?? '' });
      return;
    }
    // אין אחראי - הנקודות למי שסימן
    await complete({ id: user.uid, name: user.displayName });
  }

  return (
    <div className={`card task-card ${isDone ? 'is-done' : ''}`}>
      <button
        className={`task-check ${isDone ? 'done' : ''}`}
        onClick={toggle}
        disabled={!canComplete}
        title={canComplete ? 'סימון כבוצעה' : 'אין לך הרשאה לסמן משימה זו'}
        aria-label="סימון כבוצעה"
      >
        ✓
      </button>

      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {task.description && <div className="task-desc">{task.description}</div>}
        <div className="task-meta">
          {assignees.length === 0 ? (
            <span className="chip muted">ללא אחראי</span>
          ) : (
            assignees.map((m) => (
              <span className="chip" key={m!.userId}>
                👤 {m!.displayName}
              </span>
            ))
          )}
          {points > 0 && <span className="chip">⭐ {points}</span>}
          {recurrence !== 'none' && (
            <span className="chip muted">🔁 {RECURRENCE_LABEL[recurrence]}</span>
          )}
          {task.dueDate && (
            <span
              className="chip"
              style={
                overdue
                  ? { background: '#fee2e2', color: 'var(--danger)' }
                  : dueToday
                    ? { background: '#ffedd5', color: 'var(--warning)' }
                    : { background: 'var(--border)', color: 'var(--text-muted)' }
              }
            >
              📅 {overdue ? 'עבר: ' : dueToday ? 'היום · ' : ''}
              {formatDate(task.dueDate)}
            </span>
          )}
          {completerName && (
            <span
              className="chip"
              style={{ background: 'var(--success-light)', color: 'var(--success)' }}
            >
              ✅ בוצע ע"י {completerName}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        <button
          className="icon-btn"
          onClick={() => onInfo(task)}
          title="פרטי המשימה והיסטוריה"
          aria-label="מידע"
        >
          ℹ️
        </button>
        {canEdit && (
          <button
            className="icon-btn"
            onClick={() => onEdit(task)}
            title="עריכה"
            aria-label="עריכה"
          >
            ✏️
          </button>
        )}
      </div>

      {showChooser && (
        <BeneficiaryModal
          task={task}
          onClose={() => setShowChooser(false)}
          onChoose={(b) => {
            setShowChooser(false);
            complete(b);
          }}
        />
      )}
    </div>
  );
}
