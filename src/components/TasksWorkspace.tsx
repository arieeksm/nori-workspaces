import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ClipboardList, RefreshCw, Search, StickyNote, X } from "lucide-react";
import { useTasks } from "../hooks/useTasks";
import { useSchedules } from "../hooks/useSchedules";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { TaskForm } from "./TaskForm";
import { TaskList } from "./TaskList";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { groupTasksByDueDate } from "../lib/dates";
import { panelSpring } from "../lib/motion";
import { errorBanner, focusRing } from "../ui";
import type { CategoryFilter, Priority, Task } from "../types";

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatBriefingDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function timeToMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

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
  const { blocks: scheduleBlocks } = useSchedules();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // lg and up: split view with a sticky right column. Below: a slide-over drawer.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const todayKey = localDateKey(now);
  const todayDayOfWeek = ((now.getDay() + 6) % 7) + 1;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const todayBlocks = useMemo(
    () =>
      scheduleBlocks
        .filter((block) => block.day_of_week === todayDayOfWeek)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [scheduleBlocks, todayDayOfWeek],
  );
  const activeRoutine =
    todayBlocks.find(
      (block) => timeToMinutes(block.start_time) <= nowMinutes && nowMinutes < timeToMinutes(block.end_time),
    ) ?? null;
  const nextRoutine = todayBlocks.find((block) => timeToMinutes(block.start_time) > nowMinutes) ?? null;

  const dueTodayCount = tasks.filter((task) => task.status !== "done" && task.due_date === todayKey).length;
  const overdueCount = tasks.filter(
    (task) => task.status !== "done" && task.due_date !== null && task.due_date < todayKey,
  ).length;
  const highPriorityTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== "done" && task.priority === "high")
        .sort((a, b) => {
          if (a.due_date === null && b.due_date !== null) return 1;
          if (a.due_date !== null && b.due_date === null) return -1;
          if (a.due_date && b.due_date) {
            const dueDateOrder = a.due_date.localeCompare(b.due_date);
            if (dueDateOrder !== 0) return dueDateOrder;
          }
          return a.created_at.localeCompare(b.created_at);
        })
        .slice(0, 2),
    [tasks],
  );

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedId) ?? null, [tasks, selectedId]);

  const visibleTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

    return tasks.filter((task) => {
      const matchesCategory = filter === "all" || task.category === filter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const searchableText = [task.title, task.notes ?? "", task.category, task.priority, task.status]
        .join(" ")
        .toLocaleLowerCase();
      const matchesQuery = normalizedQuery === "" || searchableText.includes(normalizedQuery);

      return matchesCategory && matchesPriority && matchesQuery;
    });
  }, [tasks, filter, priorityFilter, searchQuery]);

  // Visual order of the list, used for J/K keyboard navigation.
  const orderedIds = useMemo(
    () => groupTasksByDueDate(visibleTasks).flatMap((g) => g.tasks.map((t) => t.id)),
    [visibleTasks],
  );

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
      const isSearchShortcut = (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k";

      if (isSearchShortcut) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const el = event.target as HTMLElement | null;
      const tag = el?.tagName;
      // The custom Select is a button with role="combobox"; treat it like a form field.
      const isCombobox = el?.getAttribute("role") === "combobox";
      const typing =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || isCombobox || Boolean(el?.isContentEditable);

      if (event.key === "Escape") {
        if (el === searchInputRef.current) {
          event.preventDefault();
          if (searchQuery !== "") {
            setSearchQuery("");
          } else {
            searchInputRef.current?.blur();
          }
        } else if (el === titleInputRef.current) {
          titleInputRef.current?.blur();
        } else if (selectedId && el?.getAttribute("aria-expanded") !== "true") {
          setSelectedId(null);
        }
        return;
      }

      if (typing) return;

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        titleInputRef.current?.focus();
      } else if ((event.key.toLowerCase() === "j" || event.key.toLowerCase() === "k") && orderedIds.length > 0) {
        event.preventDefault();
        const index = selectedId ? orderedIds.indexOf(selectedId) : -1;
        const nextIndex =
          event.key.toLowerCase() === "j" ? Math.min(index + 1, orderedIds.length - 1) : Math.max(index - 1, 0);
        setSelectedId(orderedIds[nextIndex]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, selectedId, orderedIds, searchQuery]);

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
        <TaskDetailPanel task={task} onClose={closePanel} onUpdate={updateTask} onDelete={handleDelete} />
      </motion.div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] xl:grid-cols-[minmax(0,1fr)_30rem]">
      {/* Left: quick add, filters, list */}
      <div className="min-w-0 space-y-4">
        <section aria-label="Today's briefing" className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Today&apos;s briefing
              </p>
              <h2 className="mt-1 text-sm font-semibold capitalize text-ink">{formatBriefingDate(now)}</h2>
            </div>
            <time dateTime={now.toISOString()} className="shrink-0 font-mono text-xs tabular-nums text-neutral-500">
              {formatClock(now)}
            </time>
          </div>

          <div className="mt-3 grid gap-3 border-t border-neutral-100 pt-3 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Routine</p>
              {activeRoutine ? (
                <p className="mt-1 truncate text-sm text-ink">
                  <span className="font-medium">{activeRoutine.title}</span>
                  <span className="ml-2 text-xs tabular-nums text-neutral-500">
                    {activeRoutine.start_time.slice(0, 5)}–{activeRoutine.end_time.slice(0, 5)}
                  </span>
                  <span className="ml-2 text-[11px] text-emerald-700">Ongoing</span>
                </p>
              ) : nextRoutine ? (
                <p className="mt-1 truncate text-sm text-ink">
                  <span className="font-medium">{nextRoutine.title}</span>
                  <span className="ml-2 text-xs tabular-nums text-neutral-500">
                    at {nextRoutine.start_time.slice(0, 5)}
                  </span>
                  <span className="ml-2 text-[11px] text-neutral-500">Up next</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-neutral-500">No more routines scheduled today</p>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Task deadlines</p>
              <p className="mt-1 text-sm text-ink">
                <span className="font-semibold tabular-nums">{dueTodayCount}</span>
                <span className="ml-1 text-neutral-500">due today</span>
                <span className="mx-2 text-neutral-300" aria-hidden>
                  ·
                </span>
                <span className="font-semibold tabular-nums">{overdueCount}</span>
                <span className="ml-1 text-neutral-500">overdue</span>
              </p>
            </div>
          </div>

          {highPriorityTasks.length > 0 && (
            <div className="mt-3 border-t border-neutral-100 pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">High priority</p>
              <ul className="mt-1 space-y-1">
                {highPriorityTasks.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(task.id)}
                      className={`block max-w-full truncate text-left text-sm text-ink underline decoration-neutral-300 underline-offset-2 transition hover:decoration-ink ${focusRing}`}
                    >
                      {task.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-label="Search and filter tasks" className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tasks, notes, category…"
                aria-label="Search tasks"
                autoComplete="off"
                className={`w-full rounded-md border border-neutral-200 bg-paper py-2 pl-9 pr-20 text-sm text-ink placeholder:text-neutral-400 outline-none transition focus:border-neutral-400 focus:bg-white ${focusRing}`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">
                <Kbd>⌘</Kbd> / <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">Category</span>
                {(
                  [
                    ["all", "All"],
                    ["kuliah", "Kuliah"],
                    ["ukm", "UKM"],
                    ["personal", "Personal"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value as CategoryFilter)}
                    className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                      filter === value ? "bg-ink text-white" : "bg-sunken text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">Priority</span>
                {(
                  [
                    ["all", "All"],
                    ["high", "High"],
                    ["medium", "Medium"],
                    ["low", "Low"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={priorityFilter === value}
                    onClick={() => setPriorityFilter(value as "all" | Priority)}
                    className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                      priorityFilter === value ? "bg-ink text-white" : "bg-sunken text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {(searchQuery !== "" || filter !== "all" || priorityFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setFilter("all");
                    setPriorityFilter("all");
                  }}
                  className={`ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-500 transition hover:bg-sunken hover:text-ink ${focusRing}`}
                >
                  <X className="h-3 w-3" aria-hidden />
                  Reset
                </button>
              )}
            </div>
          </div>
        </section>

        <TaskForm activeFilter={filter} onAdd={addTask} inputRef={titleInputRef} />

        <AnimatePresence initial={false}>
          {actionError && (
            <motion.div
              key="action-error"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
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
                {tasks.length === 0 ? "No tasks yet" : "No matching tasks"}
              </p>
              <p className="text-sm text-neutral-500">
                {tasks.length === 0
                  ? "Add your first task above to get started."
                  : "Try another keyword or adjust your category and priority filters."}
              </p>
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
        <aside aria-label="Task details" className="sticky top-6 h-[calc(100vh-3rem)] self-start">
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
                <p className="text-sm text-neutral-400">Edit its details, write notes and build a checklist here.</p>
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
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
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
