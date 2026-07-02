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
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { nextDueDate } from './format';
import type {
  Completion,
  HistoryEventType,
  RecurrenceType,
  Task,
  TaskHistoryEvent,
  TaskPriority,
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

function completionsCol(householdId: string) {
  return collection(db, 'households', householdId, 'completions');
}

/** מי שמקבל את הנקודות עבור הביצוע */
export interface Beneficiary {
  id: string;
  name: string;
}

/** רישום ביצוע (לצבירת נקודות עבור המוטב) */
async function logCompletion(
  householdId: string,
  task: { id: string; title: string; points?: number },
  actor: Actor,
  beneficiary: Beneficiary
): Promise<void> {
  await addDoc(completionsCol(householdId), {
    taskId: task.id,
    taskTitle: task.title,
    actorId: actor.uid,
    actorName: actor.displayName,
    beneficiaryId: beneficiary.id,
    beneficiaryName: beneficiary.name,
    points: task.points ?? 0,
    at: serverTimestamp(),
  });
}

/** מחיקת רשומות הביצוע של משימה (להפחתת נקודות בעת פתיחה מחדש) */
async function deleteCompletionsForTask(
  householdId: string,
  taskId: string
): Promise<void> {
  const snap = await getDocs(
    query(completionsCol(householdId), where('taskId', '==', taskId))
  );
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

/** מאזין לרשומות הביצוע של החשבון (לצבירת נקודות ולוח מובילים) */
export function subscribeCompletions(
  householdId: string,
  callback: (items: Completion[]) => void
): () => void {
  return onSnapshot(completionsCol(householdId), (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Completion, 'id'>) }))
    );
  });
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
  dueDate: Date | null;
  recurrence: RecurrenceType;
  points: number;
  priority: TaskPriority;
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
    dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
    recurrence: input.recurrence,
    points: input.points,
    priority: input.priority,
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
  dueDate: Date | null;
  recurrence: RecurrenceType;
  points: number;
  priority: TaskPriority;
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
    dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
    recurrence: input.recurrence,
    points: input.points,
    priority: input.priority,
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

/**
 * סימון משימה כבוצעה / החזרתה לפתוחה + רישום היסטוריה.
 * למשימה חוזרת: הביצוע מגלגל את תאריך היעד לתאריך הבא (נשארת פתוחה)
 * ורושם ביצוע לצבירת נקודות - כך שאין צורך בהרשאת יצירת משימה.
 */
export async function setTaskDone(
  householdId: string,
  taskId: string,
  done: boolean,
  actor: Actor,
  task: Task,
  beneficiary?: Beneficiary
): Promise<void> {
  const ref = doc(db, 'households', householdId, 'tasks', taskId);
  const isRecurring = (task.recurrence ?? 'none') !== 'none';

  if (done && isRecurring) {
    // גלגול תאריך היעד למחזור הבא; המשימה נשארת פתוחה
    const base = task.dueDate ? task.dueDate.toDate() : new Date();
    const next = nextDueDate(base, task.recurrence as RecurrenceType);
    await updateDoc(ref, { dueDate: Timestamp.fromDate(next) });
    if (beneficiary) await logCompletion(householdId, task, actor, beneficiary);
    await logHistory(
      householdId,
      taskId,
      'completed',
      actor,
      `בוצע מחזור${beneficiary ? ` (נקודות: ${beneficiary.name})` : ''}; תאריך יעד חדש`
    );
    return;
  }

  await updateDoc(ref, {
    status: done ? 'done' : 'open',
    completedBy: done ? actor.uid : null,
    completedAt: done ? serverTimestamp() : null,
  });
  if (done && beneficiary) {
    await logCompletion(householdId, task, actor, beneficiary);
  }
  if (!done) {
    // פתיחה מחדש - מפחיתים את הנקודות שהוענקו (מוחקים את רשומות הביצוע)
    await deleteCompletionsForTask(householdId, taskId);
  }
  await logHistory(
    householdId,
    taskId,
    done ? 'completed' : 'reopened',
    actor,
    done
      ? `המשימה סומנה כבוצעה${beneficiary ? ` (נקודות: ${beneficiary.name})` : ''}`
      : 'המשימה נפתחה מחדש (הנקודות הופחתו)'
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
