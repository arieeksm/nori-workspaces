import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Debounced autosave for a controlled value.
 *
 * - Calls `onSave(value)` once the value has been stable for `delay` ms.
 * - `onSave` resolves true on success; false marks the status as "error".
 * - Any pending change is flushed immediately when the component unmounts
 *   (for example when the side panel is closed or another task is opened).
 */
export function useAutosave<T>(
  value: T,
  onSave: (value: T) => Promise<boolean>,
  delay = 700,
): { status: SaveStatus; flush: () => Promise<void> } {
  const [status, setStatus] = useState<SaveStatus>('idle');

  const lastSaved = useRef<T>(value);
  const latest = useRef<T>(value);
  latest.current = value;
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(async () => {
    if (timer.current !== undefined) {
      window.clearTimeout(timer.current);
      timer.current = undefined;
    }
    const next = latest.current;
    if (Object.is(next, lastSaved.current)) return;

    setStatus('saving');
    const ok = await saveRef.current(next);
    if (ok) {
      lastSaved.current = next;
      setStatus('saved');
    } else {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (Object.is(value, lastSaved.current)) return;
    timer.current = window.setTimeout(() => void flush(), delay);
    return () => {
      if (timer.current !== undefined) {
        window.clearTimeout(timer.current);
        timer.current = undefined;
      }
    };
  }, [value, delay, flush]);

  // Flush on unmount so edits are never lost when the panel closes.
  useEffect(
    () => () => {
      void flush();
    },
    [flush],
  );

  return { status, flush };
}
