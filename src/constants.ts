import { Circle, CircleDot, CheckCircle2, type LucideIcon } from 'lucide-react';
import type { Category, CategoryFilter, Priority, Status } from './types';

export const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'kuliah', label: 'Kuliah' },
  { value: 'ukm', label: 'UKM' },
  { value: 'personal', label: 'Personal' },
];

/** `badge` is a flat tinted tag (like Notion's select tags); `dot` is the matching accent color. */
export const CATEGORY_META: Record<Category, { label: string; badge: string; dot: string }> = {
  kuliah: { label: 'Kuliah', badge: 'bg-sky-50 text-sky-800', dot: 'bg-sky-500' },
  ukm: { label: 'UKM', badge: 'bg-violet-50 text-violet-800', dot: 'bg-violet-500' },
  personal: { label: 'Personal', badge: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
};

export const PRIORITY_META: Record<Priority, { label: string; text: string; rank: number }> = {
  high: { label: 'High', text: 'text-red-600', rank: 0 },
  medium: { label: 'Medium', text: 'text-amber-600', rank: 1 },
  low: { label: 'Low', text: 'text-neutral-400', rank: 2 },
};

export const STATUS_ORDER: Status[] = ['todo', 'in_progress', 'done'];

export const STATUS_META: Record<
  Status,
  { label: string; icon: LucideIcon; iconClass: string; activeClass: string }
> = {
  todo: {
    label: 'To do',
    icon: Circle,
    iconClass: 'text-neutral-400 hover:text-neutral-600',
    activeClass: 'bg-neutral-200/70 text-ink',
  },
  in_progress: {
    label: 'In progress',
    icon: CircleDot,
    iconClass: 'text-amber-500 hover:text-amber-600',
    activeClass: 'bg-amber-100 text-amber-800',
  },
  done: {
    label: 'Done',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600 hover:text-emerald-700',
    activeClass: 'bg-emerald-100 text-emerald-800',
  },
};

/** todo -> in_progress -> done -> todo */
export function nextStatus(status: Status): Status {
  const index = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(index + 1) % STATUS_ORDER.length];
}
