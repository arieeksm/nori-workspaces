import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { LayoutGroup, MotionConfig, motion } from "framer-motion";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Command,
  Download,
  FileText,
  ListTodo,
  Loader2,
  LogOut,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "./Logo";
import { TasksWorkspace } from "./TasksWorkspace";
import { ScheduleView } from "./ScheduleView";
import { NotesWorkspace } from "./NotesWorkspace";
import { CommandPalette, type PaletteAction } from "./CommandPalette";
import { layoutSpring } from "../lib/motion";
import { focusRing } from "../ui";
import { useTasks } from "../hooks/useTasks";
import { useSchedules } from "../hooks/useSchedules";
import { useNotes } from "../hooks/useNotes";
import { exportWorkspaceAsJson, exportWorkspaceAsMarkdown } from "../lib/exportWorkspace";
import {
  parseWorkspaceBackupJson,
  restoreWorkspaceBackup,
  type ParsedWorkspaceBackup,
  type RestoreSummary,
} from "../lib/importWorkspace";

type View = "tasks" | "schedule" | "notes";

const VIEWS: { value: View; label: string; icon: LucideIcon }[] = [
  { value: "tasks", label: "Tasks & Deadlines", icon: ListTodo },
  { value: "schedule", label: "Jadwal Rutin", icon: CalendarClock },
  { value: "notes", label: "Notes", icon: FileText },
];

interface AppShellProps {
  /** Profile name shown in the header, with email as a fallback. */
  email?: string;
  username?: string | null;
  fullName?: string | null;
  onSignOut: () => Promise<void>;
}

function EditorialFooter() {
  return (
    <footer className="border-t border-neutral-200/70 px-4 py-5 text-xs text-neutral-400">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 lg:px-8">
        <span>Made with love by @arieeksm_id</span>
        <span aria-hidden="true">·</span>
        <a
          href="https://github.com/arieeksm"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-neutral-600"
        >
          GitHub
        </a>
        <a
          href="https://instagram.com/arieeksm_id"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-neutral-600"
        >
          Instagram
        </a>
      </div>
    </footer>
  );
}

export function AppShell({ email, username, fullName, onSignOut }: AppShellProps) {
  const [view, setView] = useState<View>("tasks");
  const [signingOut, setSigningOut] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Import / Restore state
  const [pendingBackup, setPendingBackup] = useState<ParsedWorkspaceBackup | null>(null);
  const [pendingFileName, setPendingFileName] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [restoreSummary, setRestoreSummary] = useState<RestoreSummary | null>(null);

  const tasksData = useTasks();
  const schedulesData = useSchedules();
  const notesData = useNotes();
  const displayIdentity = username ? `@${username}` : fullName || email;
  const exportDisabled = tasksData.loading || schedulesData.loading || notesData.loading;

  // Global Cmd/Ctrl + K shortcut for Command Palette
  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await onSignOut();
  }

  function handleSelectBackupFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportError(null);
    setRestoreSummary(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        const parsed = parseWorkspaceBackupJson(text);
        setPendingBackup(parsed);
        setPendingFileName(file.name);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "Gagal membaca file backup JSON.");
      }
    };
    reader.onerror = () => {
      setImportError("Tidak dapat membuka file dari perangkat.");
    };
    reader.readAsText(file);
  }

  async function handleConfirmRestore() {
    if (!pendingBackup) return;
    setRestoring(true);
    setImportError(null);
    try {
      const summary = await restoreWorkspaceBackup(pendingBackup, {
        tasks: tasksData.tasks,
        schedules: schedulesData.blocks,
        notes: notesData.notes,
      });
      setRestoreSummary(summary);
      setPendingBackup(null);
      window.setTimeout(() => {
        window.location.reload();
      }, 1400);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Gagal memulihkan data backup.");
    } finally {
      setRestoring(false);
    }
  }

  function handlePaletteAction(action: PaletteAction) {
    if (action.type === "navigate") {
      setView(action.view);
      return;
    }
    if (action.type === "create_note") {
      setView("notes");
      void notesData.createNote({
        title: "Untitled Note",
        content: "",
        category: "personal",
      });
      return;
    }
    if (action.type === "export_json" && !exportDisabled) {
      exportWorkspaceAsJson(tasksData.tasks, schedulesData.blocks, notesData.notes, username ?? undefined);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col bg-paper">
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-6 sm:pt-8 lg:px-8">
          <header className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <LogoMark size={28} title="" className="shrink-0" />
                <h1 className="text-[17px] font-semibold tracking-tight text-ink">NoRi Workspaces</h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  title="Quick search & commands (Ctrl+K)"
                  className={`inline-flex items-center gap-1.5 rounded-md border border-neutral-200/90 bg-white px-2 py-1 text-xs font-medium text-neutral-500 transition-colors hover:bg-sunken hover:text-ink ${focusRing}`}
                >
                  <Command className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">Search</span>
                  <kbd className="rounded bg-sunken px-1 py-0.2 font-mono text-[10px] text-neutral-400">Ctrl K</kbd>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleSelectBackupFile}
                  className="hidden"
                  aria-hidden="true"
                />

                <div className="relative">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={exportMenuOpen}
                    onClick={() => setExportMenuOpen((open) => !open)}
                    title="Backup & restore workspace"
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 transition-colors hover:bg-sunken hover:text-ink ${focusRing}`}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Backup
                    <ChevronDown className="h-3 w-3" aria-hidden />
                  </button>
                  {exportMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Backup and restore workspace"
                      className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-md border border-neutral-200 bg-paper p-1 shadow-sm"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        disabled={exportDisabled}
                        onClick={() => {
                          exportWorkspaceAsJson(
                            tasksData.tasks,
                            schedulesData.blocks,
                            notesData.notes,
                            username ?? undefined,
                          );
                          setExportMenuOpen(false);
                        }}
                        className={`block w-full rounded px-3 py-2 text-left text-xs text-neutral-600 transition-colors hover:bg-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                      >
                        Export JSON
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={exportDisabled}
                        onClick={() => {
                          exportWorkspaceAsMarkdown(
                            tasksData.tasks,
                            schedulesData.blocks,
                            notesData.notes,
                            username ?? undefined,
                          );
                          setExportMenuOpen(false);
                        }}
                        className={`block w-full rounded px-3 py-2 text-left text-xs text-neutral-600 transition-colors hover:bg-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                      >
                        Export Markdown
                      </button>
                      <div className="my-1 border-t border-neutral-200/80" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setExportMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className={`flex w-full items-center gap-1.5 rounded px-3 py-2 text-left text-xs font-medium text-ink transition-colors hover:bg-sunken ${focusRing}`}
                      >
                        <Upload className="h-3.5 w-3.5 text-neutral-500" aria-hidden />
                        Import JSON Backup
                      </button>
                    </div>
                  )}
                </div>

                {displayIdentity && (
                  <span
                    className="hidden max-w-[16rem] truncate text-xs text-neutral-400 sm:inline"
                    title={displayIdentity}
                  >
                    {displayIdentity}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                >
                  {signingOut ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Sign out
                </button>
              </div>
            </div>

            {importError && (
              <div
                role="alert"
                className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50/80 px-3.5 py-2 text-xs text-red-700"
              >
                <span>{importError}</span>
                <button
                  type="button"
                  onClick={() => setImportError(null)}
                  aria-label="Dismiss error"
                  className="rounded p-0.5 hover:bg-red-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {restoreSummary && (
              <div
                role="status"
                className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs text-emerald-800"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span>
                  Restore berhasil: +{restoreSummary.insertedTasks} tasks, +{restoreSummary.insertedSchedules} jadwal, +
                  {restoreSummary.insertedNotes} notes ditambahkan. Memuat ulang...
                </span>
              </div>
            )}

            <LayoutGroup id="primary-view">
              <nav aria-label="Primary view" className="mt-4 inline-flex items-center gap-1 rounded-lg bg-sunken p-1">
                {VIEWS.map(({ value, label, icon: Icon }) => {
                  const active = view === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setView(value)}
                      aria-current={active ? "page" : undefined}
                      className={`relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${focusRing} ${
                        active ? "text-ink" : "text-neutral-500 hover:text-ink"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="primary-view-pill"
                          transition={layoutSpring}
                          aria-hidden
                          className="absolute inset-0 rounded-md border border-neutral-200 bg-white"
                        />
                      )}
                      <Icon className="relative z-10 h-3.5 w-3.5" aria-hidden />
                      <span className="relative z-10">{label}</span>
                    </button>
                  );
                })}
              </nav>
            </LayoutGroup>
          </header>

          <main>
            {view === "tasks" ? (
              <TasksWorkspace active={view === "tasks"} tasksData={tasksData} schedulesData={schedulesData} />
            ) : view === "schedule" ? (
              <ScheduleView schedulesData={schedulesData} />
            ) : (
              <NotesWorkspace notesData={notesData} />
            )}
          </main>
        </div>

        <EditorialFooter />

        {/* Command Palette (Ctrl/Cmd + K) */}
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          tasks={tasksData.tasks}
          schedules={schedulesData.blocks}
          notes={notesData.notes}
          onExecute={handlePaletteAction}
        />

        {/* Restore Confirmation Modal */}
        {pendingBackup && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/35 p-4 backdrop-blur-[1px]"
          >
            <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="restore-modal-title" className="text-sm font-semibold text-ink">
                    Restore JSON Backup
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">{pendingFileName}</p>
                </div>
                <button
                  type="button"
                  disabled={restoring}
                  onClick={() => setPendingBackup(null)}
                  aria-label="Close modal"
                  className={`rounded-md p-1 text-neutral-400 hover:bg-sunken hover:text-ink ${focusRing}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-neutral-200/80 bg-sunken/70 p-3 text-xs text-neutral-700">
                <p className="font-medium text-ink">Ringkasan isi cadangan:</p>
                <ul className="mt-1.5 space-y-1 text-neutral-600">
                  <li>
                    • <strong>{pendingBackup.tasks.length}</strong> tasks & deadlines
                  </li>
                  <li>
                    • <strong>{pendingBackup.schedules.length}</strong> blok jadwal rutin
                  </li>
                  <li>
                    • <strong>{pendingBackup.notes.length}</strong> catatan (notes)
                  </li>
                </ul>
                {pendingBackup.exportedAt && (
                  <p className="mt-2 text-[11px] text-neutral-400">
                    Diekspor pada:{" "}
                    {new Date(pendingBackup.exportedAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
                Data akan digabungkan (<em>merge</em>) ke workspace aktifmu. Item yang sudah ada tidak akan diduplikasi.
              </p>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={restoring}
                  onClick={() => setPendingBackup(null)}
                  className={`rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-sunken ${focusRing}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={restoring}
                  onClick={() => void handleConfirmRestore()}
                  className={`inline-flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${focusRing}`}
                >
                  {restoring ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Upload className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {restoring ? "Restoring..." : "Merge & Restore"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
