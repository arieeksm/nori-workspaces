import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ClipboardList, RefreshCw, StickyNote, X } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { TaskForm } from './TaskForm';
import { CategoryTabs } from './CategoryTabs';
import { TaskList } from './TaskList';
import { TaskDetailPanel } from './TaskDetailPanel';
import { groupTasksByDueDate } from '../lib/dates';
import { panelSpring } from '../lib/motion';
import { errorBanner, focusRing } from '../ui';
import type { CategoryFilter, Task } from '../types';

function LoadingSkeleton() {
  return (
    <div className="space-y-1" role="status" aria-label="Loading tasks">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-[52px] animate-pulse rounded-md bg-neutral-100"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-sans text-[11px] text-neutral-500">
      {children}
    </kbd>
  );
}

interface TasksWorkspaceProps {
  /** False while another top-level view is shown; disables keyboard shortcuts. */
  active: boolean;
}

export function TasksWorkspace({ active }: TasksWorkspaceProps) {
  const {
    tasks,
    loading,
    error,
    actionError,
    clearActionError,
    refetch,
    addTask,
    updateTask,
    updateStatus,
    deleteTask,
  } = useTasks();

  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  // lg and up: split view with a sticky right column. Below: a slide-over drawer.
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedId) ?? null,
    [tasks, selectedId],
  );

  const visibleTasks = useMemo(
    () => (filter === 'all' ? tasks : tasks.filter((t) => t.category === filter)),
    [tasks, filter],
  );

  // Visual order of the list, used for J/K keyboard navigation.
  const orderedIds = useMemo(
    () => groupTasksByDueDate(visibleTasks).flatMap((g) => g.tasks.map((t) => t.id)),
    [visibleTasks],
  );

  const counts = useMemo<Record<CategoryFilter, number>>(() => {
    const open = tasks.filter((t) => t.status !== 'done');
    return {
      all: open.length,
      kuliah: open.filter((t) => t.category === 'kuliah').length,
      ukm: open.filter((t) => t.category === 'ukm').length,
      personal: open.filter((t) => t.category === 'personal').length,
    };
  }, [tasks]);

  const closePanel = useCallback(() => setSelectedId(null), []);

  const handleDelete = useCallback(
    (id: string) => {
      if (id === selectedId) setSelectedId(null);
      void deleteTask(id);
    },
    [deleteTask, selectedId],
  );

  // Keyboard shortcuts: N = new task, J/K = next/previous task, Esc = close panel.
  useEffect(() => {
    if (!active) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const el = event.target as HTMLElement | null;
      const tag = el?.tagName;
      // The custom Select is a button with role="combobox"; treat it like a form field.
      const isCombobox = el?.getAttribute('role') === 'combobox';
      const typing =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        isCombobox ||
        Boolean(el?.isContentEditable);

      if (event.key === 'Escape') {
        if (el === titleInputRef.current) {
          titleInputRef.current?.blur();
        } else if (selectedId && el?.getAttribute('aria-expanded') !== 'true') {
          setSelectedId(null);
        }
        return;
      }

      if (typing) return;

      if (event.key === 'n') {
        event.preventDefault();
        titleInputRef.current?.focus();
      } else if ((event.key === 'j' || event.key === 'k') && orderedIds.length > 0) {
        event.preventDefault();
        const index = selectedId ? orderedIds.indexOf(selectedId) : -1;
        const nextIndex =
          event.key === 'j'
            ? Math.min(index + 1, orderedIds.length - 1)
            : Math.max(index - 1, 0);
        setSelectedId(orderedIds[nextIndex]);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, selectedId, orderedIds]);

  /** The panel itself. Re-keyed per task so switching tasks cross-fades and resets drafts. */
  function renderPanel(task: Task) {
    return (
      <motion.div
        key={task.id}
        className="h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <TaskDetailPanel
          task={task}
          onClose={closePanel}
          onUpdate={updateTask}
          onDelete={handleDelete}
        />
      </motion.div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] xl:grid-cols-[minmax(0,1fr)_30rem]">
      {/* Left: quick add, filters, list */}
      <div className="min-w-0 space-y-4">
        <TaskForm activeFilter={filter} onAdd={addTask} inputRef={titleInputRef} />

        <AnimatePresence initial={false}>
          {actionError && (
            <motion.div
              key="action-error"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className={errorBanner}>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1">{actionError}</span>
                <button
                  type="button"
                  onClick={clearActionError}
                  aria-label="Dismiss error"
                  className={`rounded p-0.5 text-red-700 transition-colors hover:bg-red-100 ${focusRing}`}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <CategoryTabs active={filter} onChange={setFilter} counts={counts} />

        <div className="pt-1">
          {loading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center"
            >
              <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden />
              <div>
                <p className="font-medium text-red-800">Couldn&apos;t load your tasks</p>
                <p className="mt-1 text-sm text-red-700/80">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => void refetch()}
                className={`inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-ink transition-colors hover:bg-neutral-50 ${focusRing}`}
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Try again
              </button>
            </div>
          ) : visibleTasks.length === 0 ? (
            <motion.div
              key={`empty-${filter}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col items-center gap-2 px-6 py-16 text-center"
            >
              <ClipboardList className="h-6 w-6 text-neutral-300" aria-hidden />
              <p className="text-sm font-medium text-ink">
                {filter === 'all' ? 'No tasks yet' : 'Nothing here yet'}
              </p>
              <p className="text-sm text-neutral-500">Add your first task above to get started.</p>
            </motion.div>
          ) : (
            <TaskList
              tasks={visibleTasks}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onStatusChange={(id, status) => void updateStatus(id, status)}
              onDelete={handleDelete}
            />
          )}
        </div>

        <p className="hidden items-center gap-1.5 pt-3 text-xs text-neutral-400 lg:flex">
          <Kbd>N</Kbd> new task <span aria-hidden>·</span> <Kbd>J</Kbd>
          <Kbd>K</Kbd> move through tasks <span aria-hidden>·</span> <Kbd>Esc</Kbd> close details
        </p>
      </div>

      {/* Right (desktop): sticky side-peek column. Panel and placeholder cross-fade/slide. */}
      {isDesktop && (
        <aside
          aria-label="Task details"
          className="sticky top-6 h-[calc(100vh-3rem)] self-start"
        >
          <AnimatePresence initial={false}>
            {selectedTask ? (
              <motion.div
                key="panel"
                className="absolute inset-0"
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 32 }}
                transition={panelSpring}
              >
                {renderPanel(selectedTask)}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-200 px-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <StickyNote className="h-6 w-6 text-neutral-300" aria-hidden />
                <p className="text-sm font-medium text-neutral-600">Select a task</p>
                <p className="text-sm text-neutral-400">
                  Edit its details, write notes and build a checklist here.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      )}

      {/* Right (mobile / narrow): slide-over drawer with a dimmed backdrop. */}
      {!isDesktop && (
        <AnimatePresence>
          {selectedTask && (
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-30 bg-black/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={closePanel}
              aria-hidden
            />
          )}
          {selectedTask && (
            <motion.aside
              key="drawer"
              aria-label="Task details"
              className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white shadow-[0_0_24px_rgba(0,0,0,0.1)]"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={panelSpring}
            >
              {renderPanel(selectedTask)}
            </motion.aside>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
