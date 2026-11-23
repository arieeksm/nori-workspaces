import type { Task } from '../types';
import { PRIORITY_META } from '../constants';

/** Formats a Date as YYYY-MM-DD using the local timezone. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses YYYY-MM-DD as a local-midnight Date (avoids UTC off-by-one bugs). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from today (local) to the given date. Negative = in the past. */
export function diffInDays(iso: string, now: Date = new Date()): number {
  const target = parseISODate(iso).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

export function formatDueDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function relativeDueLabel(iso: string): string {
  const diff = diffInDays(iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatDueDate(iso);
}

export type GroupKey =
  | 'overdue'
  | 'today'
  | 'tomorrow'
  | 'this_week'
  | 'later'
  | 'no_date'
  | 'completed';

export interface TaskGroup {
  key: GroupKey;
  label: string;
  tasks: Task[];
}

const GROUP_LABELS: Record<GroupKey, string> = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  this_week: 'Next 7 days',
  later: 'Later',
  no_date: 'No due date',
  completed: 'Completed',
};

const GROUP_ORDER: GroupKey[] = [
  'overdue',
  'today',
  'tomorrow',
  'this_week',
  'later',
  'no_date',
  'completed',
];

function groupKeyFor(task: Task): GroupKey {
  if (task.status === 'done') return 'completed';
  if (!task.due_date) return 'no_date';
  const diff = diffInDays(task.due_date);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff <= 7) return 'this_week';
  return 'later';
}

function compareTasks(a: Task, b: Task): number {
  // Earlier due date first; tasks without a date last.
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  const byPriority = PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
  if (byPriority !== 0) return byPriority;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/** Groups tasks by due date bucket, omitting empty groups. */
export function groupTasksByDueDate(tasks: Task[]): TaskGroup[] {
  const buckets = new Map<GroupKey, Task[]>();
  for (const task of tasks) {
    const key = groupKeyFor(task);
    const list = buckets.get(key);
    if (list) list.push(task);
    else buckets.set(key, [task]);
  }

  return GROUP_ORDER.flatMap((key) => {
    const list = buckets.get(key);
    if (!list || list.length === 0) return [];
    return [{ key, label: GROUP_LABELS[key], tasks: [...list].sort(compareTasks) }];
  });
}
