import { forwardRef, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Flag, ListChecks, StickyNote, Trash2 } from 'lucide-react';
import type { Status, Task } from '../types';
import {
  CATEGORY_META,
  PRIORITY_META,
  STATUS_META,
  STATUS_ORDER,
  nextStatus,
} from '../constants';
import { diffInDays, relativeDueLabel } from '../lib/dates';
import { focusRing } from '../ui';

interface TaskItemProps {
  task: Task;
  selected: boolean;
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
}

/**
 * A flat list row (Things 3 / Notion style): no card, no border, just a calm hover state.
 *
 * forwardRef is required: AnimatePresence (mode="popLayout") measures the direct
 * child's DOM node while it plays its exit animation.
 */
export const TaskItem = forwardRef<HTMLLIElement, TaskItemProps>(function TaskItem(
  { task, selected, onSelect, onStatusChange, onDelete },
  forwardedRef,
) {
  const itemRef = useRef<HTMLLIElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLLIElement | null) => {
      itemRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  // Keep the selected row visible when navigating with the keyboard.
  useEffect(() => {
    if (selected) itemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const done = task.status === 'done';
  const overdue = !done && task.due_date !== null && diffInDays(task.due_date) < 0;
  const StatusIcon = STATUS_META[task.status].icon;
  const category = CATEGORY_META[task.category];
  const priority = PRIORITY_META[task.priority];
  const upcoming = nextStatus(task.status);
  const subtaskDone = task.subtasks.filter((s) => s.done).length;
  const hasNotes = (task.notes ?? '').trim().length > 0;

  return (
    <motion.li
      ref={setRefs}
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{
        layout: { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 },
        default: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
      }}
      className={`group flex items-start gap-3 rounded-md px-2.5 py-2.5 transition-colors duration-100 ${
        selected ? 'bg-sunken' : 'hover:bg-neutral-100/70'
      }`}
    >
      {/* Click to cycle: to do -> in progress -> done -> to do */}
      <button
        type="button"
        onClick={() => onStatusChange(task.id, upcoming)}
        aria-label={`Status: ${STATUS_META[task.status].label}. Mark as ${STATUS_META[upcoming].label}`}
        title={`Mark as ${STATUS_META[upcoming].label}`}
        className={`mt-0.5 shrink-0 rounded-full transition-colors duration-150 ${focusRing} ${STATUS_META[task.status].iconClass}`}
      >
        {/* Re-keyed on status change so the icon pops in with a small spring. */}
        <motion.span
          key={task.status}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 28 }}
          className="block"
        >
          <StatusIcon className="h-[18px] w-[18px]" aria-hidden />
        </motion.span>
      </button>

      {/* Opens the side-peek detail panel */}
      <button
        type="button"
        onClick={() => onSelect(task.id)}
        aria-current={selected ? 'true' : undefined}
        className={`min-w-0 flex-1 rounded-sm text-left ${focusRing}`}
      >
        <span
          className={`block break-words text-sm leading-snug transition-colors duration-200 ${
            done ? 'text-neutral-400 line-through decoration-neutral-300' : 'text-ink'
          }`}
        >
          {task.title}
        </span>

        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
          <span className={`rounded px-1.5 py-0.5 font-medium ${category.badge}`}>
            {category.label}
          </span>

          <span className={`inline-flex items-center gap-1 ${done ? 'text-neutral-400' : priority.text}`}>
            <Flag className="h-3 w-3" aria-hidden />
            {priority.label}
          </span>

          {task.due_date && (
            <span
              className={`inline-flex items-center gap-1 ${
                overdue ? 'font-medium text-red-600' : ''
              }`}
            >
              <CalendarDays className="h-3 w-3" aria-hidden />
              {relativeDueLabel(task.due_date)}
            </span>
          )}

          {task.subtasks.length > 0 && (
            <span
              className="inline-flex items-center gap-1 tabular-nums"
              title="Checklist progress"
            >
              <ListChecks className="h-3 w-3" aria-hidden />
              {subtaskDone}/{task.subtasks.length}
            </span>
          )}

          {hasNotes && (
            <span className="inline-flex items-center" title="Has notes">
              <StickyNote className="h-3 w-3" aria-hidden />
              <span className="sr-only">Has notes</span>
            </span>
          )}
        </span>
      </button>

      {/* Row actions appear on hover/focus to keep the list calm. */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-100 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        <div
          role="group"
          aria-label="Set status"
          className="hidden gap-0.5 rounded-md bg-neutral-100 p-0.5 xl:flex"
        >
          {STATUS_ORDER.map((status) => {
            const meta = STATUS_META[status];
            const Icon = meta.icon;
            const isActive = task.status === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => onStatusChange(task.id, status)}
                aria-pressed={isActive}
                title={meta.label}
                className={`rounded p-1 transition-colors duration-150 ${focusRing} ${
                  isActive ? `${meta.activeClass}` : 'text-neutral-400 hover:text-ink'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">{meta.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onDelete(task.id)}
          aria-label={`Delete task: ${task.title}`}
          title="Delete task"
          className={`rounded-md p-1.5 text-neutral-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 ${focusRing}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </motion.li>
  );
});
