import { useEffect, useState, type FormEvent, type RefObject } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import type { Category, CategoryFilter, NewTask, Priority } from '../types';
import { CATEGORY_META, PRIORITY_META } from '../constants';
import { fieldClass, primaryButton, surface } from '../ui';
import { Select, type SelectOption } from './Select';

interface TaskFormProps {
  /** Active filter tab; used as the default category for new tasks. */
  activeFilter: CategoryFilter;
  onAdd: (task: NewTask) => Promise<boolean>;
  /** Lets the parent focus the title field (keyboard shortcut "n"). */
  inputRef?: RefObject<HTMLInputElement>;
}

const MAX_TITLE_LENGTH = 200;

const CATEGORY_OPTIONS: SelectOption<Category>[] = (Object.keys(CATEGORY_META) as Category[]).map(
  (value) => ({ value, label: CATEGORY_META[value].label }),
);

const PRIORITY_OPTIONS: SelectOption<Priority>[] = (Object.keys(PRIORITY_META) as Priority[]).map(
  (value) => ({ value, label: `${PRIORITY_META[value].label} priority` }),
);

export function TaskForm({ activeFilter, onAdd, inputRef }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>(
    activeFilter === 'all' ? 'kuliah' : activeFilter,
  );
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [submitting, setSubmitting] = useState(false);

  // Follow the active tab so tasks land where the user is looking.
  useEffect(() => {
    if (activeFilter !== 'all') setCategory(activeFilter);
  }, [activeFilter]);

  const canSubmit = title.trim().length > 0 && !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    const ok = await onAdd({
      title: trimmed,
      category,
      priority,
      due_date: dueDate || null,
    });
    setSubmitting(false);

    if (ok) {
      // Keep category/priority for rapid entry of similar tasks.
      setTitle('');
      setDueDate('');
      inputRef?.current?.focus();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`${surface} flex flex-col gap-2 p-2.5 sm:flex-row sm:flex-wrap sm:items-center`}
    >
      <label className="sr-only" htmlFor="task-title">
        Task title
      </label>
      <input
        id="task-title"
        ref={inputRef}
        type="text"
        value={title}
        maxLength={MAX_TITLE_LENGTH}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task and press Enter…  (press N to focus)"
        autoComplete="off"
        className={`${fieldClass} min-w-0 flex-1 sm:min-w-[14rem]`}
      />

      <label className="sr-only" htmlFor="task-category">
        Category
      </label>
      <Select
        id="task-category"
        value={category}
        onChange={setCategory}
        options={CATEGORY_OPTIONS}
        className={`${fieldClass} min-w-[7.5rem]`}
      />

      <label className="sr-only" htmlFor="task-due">
        Due date
      </label>
      <input
        id="task-due"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className={fieldClass}
      />

      <label className="sr-only" htmlFor="task-priority">
        Priority
      </label>
      <Select
        id="task-priority"
        value={priority}
        onChange={setPriority}
        options={PRIORITY_OPTIONS}
        className={`${fieldClass} min-w-[9rem]`}
      />

      <button type="submit" disabled={!canSubmit} className={primaryButton}>
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Plus className="h-4 w-4" aria-hidden />
        )}
        Add
      </button>
    </form>
  );
}
