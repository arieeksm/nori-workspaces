import { useState } from "react";
import { LayoutGroup, MotionConfig, motion } from "framer-motion";
import { CalendarClock, ListTodo, Loader2, LogOut, type LucideIcon } from "lucide-react";
import { LogoMark } from "./Logo";
import { TasksWorkspace } from "./TasksWorkspace";
import { ScheduleView } from "./ScheduleView";
import { layoutSpring } from "../lib/motion";
import { focusRing } from "../ui";

type View = "tasks" | "schedule";

const VIEWS: { value: View; label: string; icon: LucideIcon }[] = [
  { value: "tasks", label: "Tasks & Deadlines", icon: ListTodo },
  { value: "schedule", label: "Jadwal Rutin", icon: CalendarClock },
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
  const displayIdentity = username ? `@${username}` : fullName || email;

  async function handleSignOut() {
    setSigningOut(true);
    await onSignOut();
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

          <main>{view === "tasks" ? <TasksWorkspace active={view === "tasks"} /> : <ScheduleView />}</main>
        </div>

        <EditorialFooter />
      </div>
    </MotionConfig>
  );
}
