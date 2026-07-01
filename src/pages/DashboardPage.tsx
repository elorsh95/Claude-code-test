import { useEffect, useMemo, useState } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { subscribeTasks } from '../lib/tasks';
import { hasPermission } from '../lib/permissions';
import { TaskCard } from '../components/TaskCard';
import { TaskFormModal } from '../components/TaskFormModal';
import { TaskInfoModal } from '../components/TaskInfoModal';
import type { Task } from '../types';

type Filter = 'all' | 'open' | 'done';

export function DashboardPage() {
  const { activeHousehold, currentMember } = useHousehold();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('open');

  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [infoTask, setInfoTask] = useState<Task | null>(null);

  const canCreate = hasPermission(currentMember, 'canCreateTasks');

  useEffect(() => {
    if (!activeHousehold) return;
    setLoading(true);
    const unsub = subscribeTasks(activeHousehold.id, (list) => {
      setTasks(list);
      setLoading(false);
    });
    return unsub;
  }, [activeHousehold]);

  const filtered = useMemo(() => {
    if (filter === 'open') return tasks.filter((t) => t.status === 'open');
    if (filter === 'done') return tasks.filter((t) => t.status === 'done');
    return tasks;
  }, [tasks, filter]);

  const openCount = tasks.filter((t) => t.status === 'open').length;

  return (
    <div>
      <div className="section-header">
        <h2>המשימות שלנו</h2>
        {openCount > 0 && (
          <span className="chip muted">{openCount} פתוחות</span>
        )}
      </div>

      <div className="filter-tabs">
        <button
          className={filter === 'open' ? 'active' : ''}
          onClick={() => setFilter('open')}
        >
          פתוחות
        </button>
        <button
          className={filter === 'done' ? 'active' : ''}
          onClick={() => setFilter('done')}
        >
          בוצעו
        </button>
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          הכל
        </button>
      </div>

      {loading ? (
        <div className="spinner" style={{ margin: '3rem auto' }} />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">🧹</span>
          {filter === 'done'
            ? 'עדיין לא בוצעו משימות'
            : 'אין משימות פתוחות. זמן לנוח!'}
        </div>
      ) : (
        filtered.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onInfo={setInfoTask}
            onEdit={setEditTask}
          />
        ))
      )}

      {canCreate && (
        <div className="fab">
          <button className="btn" onClick={() => setShowCreate(true)}>
            ＋ משימה חדשה
          </button>
        </div>
      )}

      {showCreate && <TaskFormModal onClose={() => setShowCreate(false)} />}
      {editTask && (
        <TaskFormModal task={editTask} onClose={() => setEditTask(null)} />
      )}
      {infoTask && (
        <TaskInfoModal task={infoTask} onClose={() => setInfoTask(null)} />
      )}
    </div>
  );
}
