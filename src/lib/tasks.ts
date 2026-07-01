import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type {
  HistoryEventType,
  Task,
  TaskHistoryEvent,
} from '../types';

interface Actor {
  uid: string;
  displayName: string;
}

function tasksCol(householdId: string) {
  return collection(db, 'households', householdId, 'tasks');
}

function historyCol(householdId: string, taskId: string) {
  return collection(db, 'households', householdId, 'tasks', taskId, 'history');
}

/** רישום אירוע בהיסטוריית משימה */
async function logHistory(
  householdId: string,
  taskId: string,
  type: HistoryEventType,
  actor: Actor,
  details?: string
): Promise<void> {
  await addDoc(historyCol(householdId, taskId), {
    type,
    actorId: actor.uid,
    actorName: actor.displayName,
    details: details ?? '',
    timestamp: serverTimestamp(),
  });
}

/** מאזין בזמן אמת לרשימת המשימות של חשבון */
export function subscribeTasks(
  householdId: string,
  callback: (tasks: Task[]) => void
): () => void {
  const q = query(tasksCol(householdId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }))
    );
  });
}

interface CreateTaskInput {
  title: string;
  description: string;
  assigneeIds: string[];
  assigneeNames: string[];
}

/** יצירת משימה חדשה + רישום אירועי היסטוריה */
export async function createTask(
  householdId: string,
  input: CreateTaskInput,
  actor: Actor
): Promise<string> {
  const ref = await addDoc(tasksCol(householdId), {
    title: input.title.trim(),
    description: input.description.trim(),
    assigneeIds: input.assigneeIds,
    status: 'open',
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    completedBy: null,
    completedAt: null,
  });

  await logHistory(householdId, ref.id, 'created', actor, 'המשימה נוצרה');
  if (input.assigneeNames.length > 0) {
    await logHistory(
      householdId,
      ref.id,
      'assigned',
      actor,
      `שויכו: ${input.assigneeNames.join(', ')}`
    );
  }
  return ref.id;
}

interface UpdateTaskInput {
  title: string;
  description: string;
  assigneeIds: string[];
  /** רשימת שמות החדשה - לרישום היסטוריית שיוך אם השתנתה */
  assigneeNames: string[];
  /** האם רשימת האחראים השתנתה */
  assigneesChanged: boolean;
}

/** עדכון פרטי משימה + רישום היסטוריה */
export async function updateTask(
  householdId: string,
  taskId: string,
  input: UpdateTaskInput,
  actor: Actor
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'tasks', taskId), {
    title: input.title.trim(),
    description: input.description.trim(),
    assigneeIds: input.assigneeIds,
  });
  await logHistory(householdId, taskId, 'updated', actor, 'פרטי המשימה עודכנו');
  if (input.assigneesChanged) {
    const names =
      input.assigneeNames.length > 0
        ? input.assigneeNames.join(', ')
        : 'ללא אחראים';
    await logHistory(householdId, taskId, 'assigned', actor, `אחראים: ${names}`);
  }
}

/** סימון משימה כבוצעה / החזרתה לפתוחה + רישום היסטוריה */
export async function setTaskDone(
  householdId: string,
  taskId: string,
  done: boolean,
  actor: Actor
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'tasks', taskId), {
    status: done ? 'done' : 'open',
    completedBy: done ? actor.uid : null,
    completedAt: done ? serverTimestamp() : null,
  });
  await logHistory(
    householdId,
    taskId,
    done ? 'completed' : 'reopened',
    actor,
    done ? 'המשימה סומנה כבוצעה' : 'המשימה נפתחה מחדש'
  );
}

/** מחיקת משימה (כולל תת-אוסף ההיסטוריה) */
export async function deleteTask(
  householdId: string,
  taskId: string
): Promise<void> {
  const hSnap = await getDocs(historyCol(householdId, taskId));
  await Promise.all(hSnap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'households', householdId, 'tasks', taskId));
}

/** מאזין להיסטוריית משימה (לפי סדר כרונולוגי) */
export function subscribeTaskHistory(
  householdId: string,
  taskId: string,
  callback: (events: TaskHistoryEvent[]) => void
): () => void {
  const q = query(historyCol(householdId, taskId), orderBy('timestamp', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TaskHistoryEvent, 'id'>),
      }))
    );
  });
}
