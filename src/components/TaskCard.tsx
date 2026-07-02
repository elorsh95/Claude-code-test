import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { setTaskDone } from '../lib/tasks';
import { canCompleteTask, hasPermission } from '../lib/permissions';
import type { Task } from '../types';

interface Props {
  task: Task;
  onInfo: (task: Task) => void;
  onEdit: (task: Task) => void;
}

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

  async function toggle() {
    if (!user || !activeHousehold || !canComplete) return;
    await setTaskDone(activeHousehold.id, task.id, !isDone, {
      uid: user.uid,
      displayName: user.displayName,
    });
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
    </div>
  );
}
