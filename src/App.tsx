import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { DemoContext } from "./lib/demoData";
import { LoginScreen } from "./components/LoginScreen";
import { AppShell } from "./components/AppShell";
import { focusRing } from "./ui";

/**
 * Session & Demo gate. Nothing from the private database is fetched unless a valid
 * Supabase session exists. When `demoMode` is true, DemoContext supplies isolated
 * in-memory sample data with zero network requests.
 */
export default function App() {
  const { session, profile, loading, signIn, signOut } = useAuth();
  const [demoMode, setDemoMode] = useState(false);

  if (loading && !demoMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper" role="status" aria-label="Loading">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" aria-hidden />
      </div>
    );
  }

  if (session) {
    return (
      <DemoContext.Provider value={false}>
        <AppShell
          email={session.user.email}
          username={profile?.username}
          fullName={profile?.full_name}
          onSignOut={signOut}
        />
      </DemoContext.Provider>
    );
  }

  if (demoMode) {
    return (
      <DemoContext.Provider value={true}>
        <div className="border-b border-amber-200/80 bg-amber-50/90 px-4 py-2 text-xs text-amber-900">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
              <span>
                <strong>Interactive Preview Mode</strong> — You are viewing sample data. Edits stay in your browser and
                reset on refresh.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDemoMode(false)}
              className={`rounded-md border border-amber-300 bg-white px-2.5 py-1 font-medium text-amber-950 transition-colors hover:bg-amber-100 ${focusRing}`}
            >
              Exit Preview / Sign In
            </button>
          </div>
        </div>
        <AppShell
          email="guest@demo.local"
          onSignOut={async () => {
            setDemoMode(false);
          }}
        />
      </DemoContext.Provider>
    );
  }

  return <LoginScreen onSignIn={signIn} onEnterDemo={() => setDemoMode(true)} />;
}
