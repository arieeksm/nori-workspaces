import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Loader2, Plus, Trash2, X } from 'lucide-react';
import type { Category, Priority, Status, Subtask, Task, TaskPatch } from '../types';
import { CATEGORY_META, PRIORITY_META, STATUS_META, STATUS_ORDER } from '../constants';
import { useAutosave, type SaveStatus } from '../hooks/useAutosave';
import { newId } from '../lib/id';
import { layoutSpring } from '../lib/motion';
import { Markdown } from '../lib/markdown';
import { fieldBase, focusRing, ghostIconButton, sectionLabel } from '../ui';
import { Select, type SelectOption } from './Select';

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onUpdate: (id: string, patch: TaskPatch) => Promise<boolean>;
  onDelete: (id: string) => void;
}

const panelField = `h-9 w-full ${fieldBase}`;

const CATEGORY_OPTIONS: SelectOption<Category>[] = (Object.keys(CATEGORY_META) as Category[]).map(
  (value) => ({ value, label: CATEGORY_META[value].label }),
);

const PRIORITY_OPTIONS: SelectOption<Priority>[] = (Object.keys(PRIORITY_META) as Priority[]).map(
  (value) => ({ value, label: PRIORITY_META[value].label }),
);

function combineStatus(a: SaveStatus, b: SaveStatus): SaveStatus {
  if (a === 'error' || b === 'error') return 'error';
  if (a === 'saving' || b === 'saving') return 'saving';
  if (a === 'saved' || b === 'saved') return 'saved';
  return 'idle';
}

export function TaskDetailPanel({ task, onClose, onUpdate, onDelete }: TaskDetailPanelProps) {
  // Drafts for text fields that are autosaved with a debounce.
  // The parent keys this component by task.id, so drafts reset when switching tasks.
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [notesMode, setNotesMode] = useState<'write' | 'preview'>('write');
  const [newSubtask, setNewSubtask] = useState('');

  const titleSave = useAutosave(title, async (value) => {
    const trimmed = value.trim();
    if (!trimmed) return false; // empty titles are never persisted
    return onUpdate(task.id, { title: trimmed });
  });

  const notesSave = useAutosave(notes, async (value) =>
    onUpdate(task.id, { notes: value.trim() === '' ? null : value }),
  );

  const saveState = combineStatus(titleSave.status, notesSave.status);

  function retrySave() {
    void titleSave.flush();
    void notesSave.flush();
  }

  const subtasks = task.subtasks;
  const doneCount = subtasks.filter((s) => s.done).length;
  const progress = subtasks.length === 0 ? 0 : Math.round((doneCount / subtasks.length) * 100);

  function commitSubtasks(next: Subtask[]) {
    void onUpdate(task.id, { subtasks: next });
  }

  function handleAddSubtask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newSubtask.trim();
    if (!trimmed) return;
    commitSubtasks([...subtasks, { id: newId(), title: trimmed, done: false }]);
    setNewSubtask('');
  }

  function toggleSubtask(id: string) {
    commitSubtasks(subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  }

  function removeSubtask(id: string) {
    commitSubtasks(subtasks.filter((s) => s.id !== id));
  }

  const created = new Date(task.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex h-full flex-col overflow-hidden border-l border-neutral-200 bg-white lg:rounded-lg lg:border">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-xs text-neutral-500" aria-live="polite">
          {saveState === 'saving' && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Saving…
            </>
          )}
          {saveState === 'saved' && (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              Saved
            </>
          )}
          {saveState === 'error' && (
            <button
              type="button"
              onClick={retrySave}
              className={`inline-flex items-center gap-1 rounded-sm text-red-600 hover:text-red-700 ${focusRing}`}
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              Not saved — retry
            </button>
          )}
          {saveState === 'idle' && <span>Created {created}</span>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          title="Close (Esc)"
          className={ghostIconButton}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
        <div>
          <label className="sr-only" htmlFor="detail-title">
            Task title
          </label>
          <input
            id="detail-title"
            type="text"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => void titleSave.flush()}
            placeholder="Untitled task"
            className="w-full rounded-md bg-transparent px-1 py-0.5 text-2xl font-semibold tracking-tight text-ink outline-none transition-colors placeholder:text-neutral-300 hover:bg-neutral-50 focus:bg-neutral-50"
          />
          {title.trim() === '' && (
            <p className="mt-1 px-1 text-xs text-red-600">Title can&apos;t be empty.</p>
          )}
        </div>

        {/* Properties */}
        <dl className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 text-sm">
          <dt className="text-neutral-500">Status</dt>
          <dd>
            <div
              role="group"
              aria-label="Status"
              className="inline-flex gap-0.5 rounded-md bg-neutral-100 p-0.5"
            >
              {STATUS_ORDER.map((status: Status) => {
                const meta = STATUS_META[status];
                const Icon = meta.icon;
                const active = task.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={active}
                    onClick={() => void onUpdate(task.id, { status })}
                    className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors duration-150 ${focusRing} ${
                      active ? meta.activeClass : 'text-neutral-500 hover:text-ink'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </dd>

          <dt className="text-neutral-500">
            <label htmlFor="detail-category">Category</label>
          </dt>
          <dd>
            <Select
              id="detail-category"
              value={task.category}
              onChange={(category) => void onUpdate(task.id, { category })}
              options={CATEGORY_OPTIONS}
              className={panelField}
            />
          </dd>

          <dt className="text-neutral-500">
            <label htmlFor="detail-due">Due date</label>
          </dt>
          <dd className="flex items-center gap-2">
            <input
              id="detail-due"
              type="date"
              value={task.due_date ?? ''}
              onChange={(e) => void onUpdate(task.id, { due_date: e.target.value || null })}
              className={panelField}
            />
            {task.due_date && (
              <button
                type="button"
                onClick={() => void onUpdate(task.id, { due_date: null })}
                aria-label="Clear due date"
                title="Clear due date"
                className={`shrink-0 ${ghostIconButton}`}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </dd>

          <dt className="text-neutral-500">
            <label htmlFor="detail-priority">Priority</label>
          </dt>
          <dd>
            <Select
              id="detail-priority"
              value={task.priority}
              onChange={(priority) => void onUpdate(task.id, { priority })}
              options={PRIORITY_OPTIONS}
              className={panelField}
            />
          </dd>
        </dl>

        {/* Checklist */}
        <section aria-labelledby="detail-subtasks">
          <div className="mb-2 flex items-baseline justify-between border-b border-neutral-200 pb-1.5">
            <h3 id="detail-subtasks" className={sectionLabel}>
              Checklist
            </h3>
            {subtasks.length > 0 && (
              <span className="text-xs tabular-nums text-neutral-400">
                {doneCount}/{subtasks.length}
              </span>
            )}
          </div>

          {subtasks.length > 0 && (
            <div
              className="mb-2 h-0.5 overflow-hidden rounded-full bg-neutral-200"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Checklist progress"
            >
              <motion.div
                className="h-full rounded-full bg-ink"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={layoutSpring}
              />
            </div>
          )}

          <ul className="relative">
            <AnimatePresence initial={false} mode="popLayout">
              {subtasks.map((subtask) => (
                <motion.li
                  key={subtask.id}
                  layout="position"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{
                    layout: { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 },
                    default: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
                  }}
                  className="group flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-neutral-50"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={subtask.done}
                    aria-label={`${subtask.done ? 'Uncheck' : 'Check'}: ${subtask.title}`}
                    onClick={() => toggleSubtask(subtask.id)}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-150 ${focusRing} ${
                      subtask.done
                        ? 'border-ink bg-ink text-white'
                        : 'border-neutral-300 bg-white hover:border-neutral-500'
                    }`}
                  >
                    <AnimatePresence initial={false}>
                      {subtask.done && (
                        <motion.span
                          key="tick"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                          className="flex"
                        >
                          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                  <span
                    className={`min-w-0 flex-1 break-words text-sm transition-colors duration-200 ${
                      subtask.done ? 'text-neutral-400 line-through' : 'text-ink'
                    }`}
                  >
                    {subtask.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSubtask(subtask.id)}
                    aria-label={`Delete subtask: ${subtask.title}`}
                    className={`shrink-0 rounded p-1 text-neutral-400 opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${focusRing}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <form onSubmit={handleAddSubtask} className="mt-2 flex items-center gap-2">
            <label className="sr-only" htmlFor="detail-new-subtask">
              Add a subtask
            </label>
            <input
              id="detail-new-subtask"
              type="text"
              value={newSubtask}
              maxLength={200}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add an item and press Enter…"
              autoComplete="off"
              className={panelField}
            />
            <button
              type="submit"
              disabled={newSubtask.trim() === ''}
              aria-label="Add subtask"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-ink active:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </section>

        {/* Notes */}
        <section aria-labelledby="detail-notes">
          <div className="mb-2 flex items-center justify-between border-b border-neutral-200 pb-1.5">
            <h3 id="detail-notes" className={sectionLabel}>
              Notes
            </h3>
            <div role="group" aria-label="Notes mode" className="inline-flex gap-1 text-xs">
              {(['write', 'preview'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={notesMode === mode}
                  onClick={() => setNotesMode(mode)}
                  className={`rounded px-1.5 py-0.5 font-medium capitalize transition-colors duration-150 ${focusRing} ${
                    notesMode === mode
                      ? 'bg-neutral-100 text-ink'
                      : 'text-neutral-400 hover:text-ink'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {notesMode === 'write' ? (
            <>
              <label className="sr-only" htmlFor="detail-notes-input">
                Notes
              </label>
              <textarea
                id="detail-notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => void notesSave.flush()}
                placeholder={'Write notes… Markdown works: # heading, - list, **bold**, `code`, [link](https://…)'}
                spellCheck
                className={`${fieldBase} min-h-[14rem] w-full resize-y py-3 leading-relaxed`}
              />
            </>
          ) : (
            <div className="min-h-[14rem] rounded-md bg-neutral-50 p-3.5">
              <Markdown source={notes} />
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 px-4 py-2.5">
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 ${focusRing}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Delete task
        </button>
      </div>
    </div>
  );
}
