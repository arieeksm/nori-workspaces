import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Custom dropdown that replaces the native <select>.
 *
 * Why: on Windows Chrome the native option list is drawn by the OS and can ignore the page
 * theme (white background with white text). This component renders its own listbox, so
 * colors are always ours.
 *
 * Behaviour: a button trigger + a listbox rendered in a portal (so it is never clipped by a
 * scrolling parent). Keyboard: Arrow keys, Home/End, Enter/Space to choose, Esc to close,
 * type a letter to jump to a matching option. Click outside closes it.
 */

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  /** Matches a <label htmlFor="..."> so the control keeps an accessible name. */
  id?: string;
  /** Classes for the trigger button (use a field token from ui.ts for size/colors). */
  className?: string;
  disabled?: boolean;
}

interface Position {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const GAP = 4;
const VIEWPORT_MARGIN = 8;
const MAX_LIST_HEIGHT = 288;

export function Select<T extends string | number>({
  value,
  onChange,
  options,
  id,
  className = '',
  disabled = false,
}: SelectProps<T>) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: '', timer: undefined as number | undefined });

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options.find((o) => o.value === value);

  const openList = useCallback(() => {
    if (disabled) return;
    setActiveIndex(selectedIndex);
    setOpen(true);
  }, [disabled, selectedIndex]);

  const closeList = useCallback(() => setOpen(false), []);

  const choose = useCallback(
    (index: number) => {
      const option = options[index];
      if (option) onChange(option.value);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onChange, options],
  );

  // Place the list under the trigger (or above it when there is more room there).
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;
    const flip = spaceBelow < 160 && spaceAbove > spaceBelow;
    const width = Math.max(rect.width, 160);
    const left = Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN);

    setPosition(
      flip
        ? {
            left: Math.max(VIEWPORT_MARGIN, left),
            width,
            bottom: window.innerHeight - rect.top + GAP,
            maxHeight: Math.min(MAX_LIST_HEIGHT, spaceAbove),
          }
        : {
            left: Math.max(VIEWPORT_MARGIN, left),
            width,
            top: rect.bottom + GAP,
            maxHeight: Math.min(MAX_LIST_HEIGHT, spaceBelow),
          },
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    // Capture scrolls from any ancestor (such as the side panel body).
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // Keep the highlighted option in view while using the keyboard.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, position]);

  useEffect(
    () => () => {
      window.clearTimeout(typeahead.current.timer);
    },
    [],
  );

  function jumpToMatch(char: string) {
    const state = typeahead.current;
    window.clearTimeout(state.timer);
    state.text += char.toLowerCase();
    state.timer = window.setTimeout(() => {
      state.text = '';
    }, 600);

    const from = open ? activeIndex : selectedIndex;
    const ordered = [...options.slice(from + 1), ...options.slice(0, from + 1)];
    const match = ordered.find((o) => o.label.toLowerCase().startsWith(state.text));
    if (!match) return;
    const index = options.indexOf(match);
    if (open) setActiveIndex(index);
    else onChange(match.value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openList();
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        jumpToMatch(event.key);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(activeIndex);
        break;
      case 'Escape':
        // Only close the list; don't let the global Esc handler also close the side panel.
        event.preventDefault();
        event.stopPropagation();
        closeList();
        break;
      case 'Tab':
        closeList();
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          jumpToMatch(event.key);
        }
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={onKeyDown}
        className={`flex min-w-0 items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && position && (
            <motion.ul
              ref={listRef}
              id={listId}
              role="listbox"
              initial={{ opacity: 0, y: position.bottom !== undefined ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                left: position.left,
                width: position.width,
                top: position.top,
                bottom: position.bottom,
                maxHeight: position.maxHeight,
              }}
              className="z-[60] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1 text-sm text-ink shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={String(option.value)}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    // mousedown (not click) keeps focus on the trigger and avoids the outside-click close.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(index);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 ${
                      isActive ? 'bg-neutral-100' : ''
                    } ${isSelected ? 'font-medium' : ''}`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />}
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
