import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  Download,
  FileText,
  ListTodo,
  Plus,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { focusRing } from "../ui";
import type { Note, Task, WeeklySchedule } from "../types";

export type PaletteAction =
  | { type: "navigate"; view: "tasks" | "schedule" | "notes" }
  | { type: "create_note" }
  | { type: "export_json" };

interface CommandItem {
  id: string;
  group: "Quick Actions" | "Tasks & Deadlines" | "Jadwal Rutin" | "Notes";
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  action: PaletteAction;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  schedules: WeeklySchedule[];
  notes: Note[];
  onExecute: (action: PaletteAction) => void;
}

const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;

export function CommandPalette({ open, onClose, tasks, schedules, notes, onExecute }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const allItems = useMemo<CommandItem[]>(() => {
    const actions: CommandItem[] = [
      {
        id: "act-nav-tasks",
        group: "Quick Actions",
        title: "Go to Tasks & Deadlines",
        subtitle: "Lihat daftar tugas dan tenggat waktu",
        icon: ListTodo,
        action: { type: "navigate", view: "tasks" },
      },
      {
        id: "act-nav-schedule",
        group: "Quick Actions",
        title: "Go to Jadwal Rutin",
        subtitle: "Buka jadwal mingguan kuliah & UKM",
        icon: CalendarClock,
        action: { type: "navigate", view: "schedule" },
      },
      {
        id: "act-nav-notes",
        group: "Quick Actions",
        title: "Go to Notes",
        subtitle: "Buka editor catatan Markdown",
        icon: FileText,
        action: { type: "navigate", view: "notes" },
      },
      {
        id: "act-new-note",
        group: "Quick Actions",
        title: "Create New Note",
        subtitle: "Buat catatan baru di workspace",
        icon: Plus,
        action: { type: "create_note" },
      },
      {
        id: "act-export-json",
        group: "Quick Actions",
        title: "Export Workspace JSON",
        subtitle: "Unduh cadangan lengkap (tasks, jadwal, notes)",
        icon: Download,
        action: { type: "export_json" },
      },
    ];

    const taskItems: CommandItem[] = tasks.map((t) => ({
      id: `task-${t.id}`,
      group: "Tasks & Deadlines",
      title: t.title,
      subtitle: `${t.category.toUpperCase()} · ${t.status === "done" ? "Selesai" : t.due_date ? `Due ${t.due_date}` : "Tanpa tenggat"}`,
      icon: ListTodo,
      action: { type: "navigate", view: "tasks" },
    }));

    const scheduleItems: CommandItem[] = schedules.map((s) => {
      const dayName = DAY_NAMES[s.day_of_week - 1] ?? `Hari ${s.day_of_week}`;
      const loc = s.location ? ` · ${s.location}` : "";
      return {
        id: `sched-${s.id}`,
        group: "Jadwal Rutin",
        title: s.title,
        subtitle: `${dayName}, ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}${loc}`,
        icon: CalendarClock,
        action: { type: "navigate", view: "schedule" },
      };
    });

    const noteItems: CommandItem[] = notes.map((n) => ({
      id: `note-${n.id}`,
      group: "Notes",
      title: n.title || "Untitled Note",
      subtitle: `${n.category.toUpperCase()}${n.content.trim() ? ` · ${n.content.trim().slice(0, 60)}` : ""}`,
      icon: FileText,
      action: { type: "navigate", view: "notes" },
    }));

    return [...actions, ...taskItems, ...scheduleItems, ...noteItems];
  }, [tasks, schedules, notes]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Saat kosong, tampilkan Quick Actions + maksimal 6 item terbaru agar ringkas
      return allItems.slice(0, 11);
    }
    return allItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
          item.group.toLowerCase().includes(q),
      )
      .slice(0, 15);
  }, [allItems, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (filteredItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredItems[selectedIndex];
      if (target) {
        onExecute(target.action);
        onClose();
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick command palette"
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-start justify-center bg-neutral-900/35 px-4 pt-16 sm:pt-24 backdrop-blur-[1px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-2.5 border-b border-neutral-200/80 px-3.5 py-3">
          <Search className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik perintah atau cari tasks, jadwal, notes..."
            aria-label="Search commands and workspace"
            className="w-full bg-transparent text-sm text-ink placeholder:text-neutral-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className={`rounded p-1 text-neutral-400 hover:bg-sunken hover:text-ink ${focusRing}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-400">
              Tidak ada hasil yang cocok untuk &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              const showGroupHeader = idx === 0 || filteredItems[idx - 1].group !== item.group;

              return (
                <div key={item.id}>
                  {showGroupHeader && (
                    <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                      {item.group}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => {
                      onExecute(item.action);
                      onClose();
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      isSelected ? "bg-sunken text-ink" : "text-neutral-600 hover:bg-sunken/60"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${isSelected ? "text-ink" : "text-neutral-400"}`}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-ink">{item.title}</p>
                        {item.subtitle && <p className="truncate text-[11px] text-neutral-400">{item.subtitle}</p>}
                      </div>
                    </div>
                    <ArrowRight
                      className={`h-3.5 w-3.5 shrink-0 transition-opacity ${
                        isSelected ? "text-neutral-500 opacity-100" : "opacity-0"
                      }`}
                      aria-hidden
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between border-t border-neutral-200/80 bg-sunken/60 px-3.5 py-2 text-[11px] text-neutral-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-neutral-200 bg-white px-1 py-0.5 font-mono text-[10px] text-neutral-600">
                ↑↓
              </kbd>{" "}
              Navigasi
            </span>
            <span>
              <kbd className="rounded border border-neutral-200 bg-white px-1 py-0.5 font-mono text-[10px] text-neutral-600">
                Enter
              </kbd>{" "}
              Buka
            </span>
          </div>
          <span>
            <kbd className="rounded border border-neutral-200 bg-white px-1 py-0.5 font-mono text-[10px] text-neutral-600">
              Esc
            </kbd>{" "}
            Tutup
          </span>
        </div>
      </div>
    </div>
  );
}
