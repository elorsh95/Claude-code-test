import { useEffect, useMemo, useState } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { subscribeTasks } from '../lib/tasks';
import { hasPermission } from '../lib/permissions';
import { TaskCard } from '../components/TaskCard';
import { TaskFormModal } from '../components/TaskFormModal';
import { TaskInfoModal } from '../components/TaskInfoModal';
import { TaskCalendar } from '../components/TaskCalendar';
import type { Task, TaskPriority } from '../types';

type Filter = 'all' | 'open' | 'done';
type SortBy = 'due' | 'priority' | 'created';

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

export function DashboardPage() {
  const { activeHousehold, members, currentMember } = useHousehold();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<Filter>('open');
  const [completerFilter, setCompleterFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('due');

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

  useEffect(() => {
    if (filter !== 'done') setCompleterFilter('all');
  }, [filter]);

  // סינון משותף (חיפוש + אחראי) — חל גם על תצוגת הרשימה וגם על הלוח שנה
  const baseFiltered = useMemo(() => {
    let list = tasks;
    if (assigneeFilter !== 'all') {
      list = list.filter((t) => t.assigneeIds.includes(assigneeFilter));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tasks, assigneeFilter, search]);

  const listFiltered = useMemo(() => {
    let list = baseFiltered;
    if (filter === 'open') list = list.filter((t) => t.status === 'open');
    if (filter === 'done') list = list.filter((t) => t.status === 'done');
    if (filter === 'done' && completerFilter !== 'all') {
      list = list.filter((t) => t.completedBy === completerFilter);
    }
    const sorted = [...list];
    if (sortBy === 'due') {
      sorted.sort((a, b) => {
        const da = a.dueDate ? a.dueDate.toMillis() : Infinity;
        const db2 = b.dueDate ? b.dueDate.toMillis() : Infinity;
        return da - db2;
      });
    } else if (sortBy === 'priority') {
      sorted.sort(
        (a, b) =>
          PRIORITY_RANK[a.priority ?? 'normal'] -
          PRIORITY_RANK[b.priority ?? 'normal']
      );
    } else {
      sorted.sort((a, b) => {
        const ca = a.createdAt ? a.createdAt.toMillis() : 0;
        const cb = b.createdAt ? b.createdAt.toMillis() : 0;
        return cb - ca;
      });
    }
    return sorted;
  }, [baseFiltered, filter, completerFilter, sortBy]);

  const openCount = tasks.filter((t) => t.status === 'open').length;

  return (
    <div>
      <div className="section-header">
        <h2>המשימות שלנו</h2>
        {openCount > 0 && <span className="chip muted">{openCount} פתוחות</span>}
      </div>

      {/* מעבר בין רשימה ללוח שנה */}
      <div className="filter-tabs" style={{ marginBottom: '0.8rem' }}>
        <button
          className={view === 'list' ? 'active' : ''}
          onClick={() => setView('list')}
        >
          📋 רשימה
        </button>
        <button
          className={view === 'calendar' ? 'active' : ''}
          onClick={() => setView('calendar')}
        >
          🗓️ לוח שנה
        </button>
      </div>

      {/* חיפוש */}
      <div className="field" style={{ marginBottom: '0.6rem' }}>
        <input
          type="search"
          placeholder="🔍 חיפוש משימה…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* סינון לפי אחראי */}
      {members.length > 0 && (
        <div className="field" style={{ marginBottom: '0.6rem' }}>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            aria-label="סינון לפי אחראי"
          >
            <option value="all">👤 אחראי: כולם</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                אחראי: {m.displayName}
              </option>
            ))}
          </select>
        </div>
      )}

      {view === 'calendar' ? (
        <TaskCalendar
          tasks={baseFiltered}
          onInfo={setInfoTask}
          onEdit={setEditTask}
        />
      ) : (
        <>
          {/* מיון */}
          <div className="field" style={{ marginBottom: '0.6rem' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              aria-label="מיון"
            >
              <option value="due">מיון: תאריך יעד</option>
              <option value="priority">מיון: עדיפות</option>
              <option value="created">מיון: נוצר לאחרונה</option>
            </select>
          </div>

          {/* סטטוס */}
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

          {filter === 'done' && (
            <div className="field">
              <select
                value={completerFilter}
                onChange={(e) => setCompleterFilter(e.target.value)}
                aria-label="סינון לפי מבצע"
              >
                <option value="all">🔎 מי ביצע: כולם</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    בוצע ע"י {m.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="spinner" style={{ margin: '3rem auto' }} />
          ) : listFiltered.length === 0 ? (
            <div className="empty-state">
              <span className="emoji">🧹</span>
              {search || assigneeFilter !== 'all'
                ? 'לא נמצאו משימות מתאימות'
                : filter === 'done'
                  ? 'עדיין לא בוצעו משימות'
                  : 'אין משימות פתוחות. זמן לנוח!'}
            </div>
          ) : (
            listFiltered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onInfo={setInfoTask}
                onEdit={setEditTask}
              />
            ))
          )}
        </>
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
