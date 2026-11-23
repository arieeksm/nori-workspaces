import { useState, type FormEvent } from "react";
import { AlertTriangle, Eye, EyeOff, Loader2, Play } from "lucide-react";
import { LogoMark } from "./Logo";
import { errorBanner, fieldClass, focusRing, primaryButton } from "../ui";

interface LoginScreenProps {
  /** Resolves to null on success, or an error message to show. */
  onSignIn: (identifier: string, password: string) => Promise<string | null>;
  onEnterDemo?: () => void;
}

function EditorialFooter() {
  return (
    <footer className="w-full border-t border-neutral-200/70 px-4 py-5 text-xs text-neutral-400">
      <div className="mx-auto flex max-w-sm flex-wrap items-center justify-center gap-x-3 gap-y-1">
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

export function LoginScreen({ onSignIn, onEnterDemo }: LoginScreenProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = identifier.trim() !== "" && password !== "" && !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    const message = await onSignIn(identifier.trim(), password);
    if (message) {
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <LogoMark size={40} title="" />
            <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">Sign in to NoRi Workspaces</h1>
            <p className="mt-1.5 text-sm text-neutral-500">This workspace is private.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-identifier" className="mb-1.5 block text-sm font-medium text-ink">
                Email or Username
              </label>
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                autoFocus
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Email or username"
                className={`${fieldClass} w-full`}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-ink">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${fieldClass} w-full pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className={`absolute inset-y-0 right-1 my-auto flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:text-ink ${focusRing}`}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className={errorBanner}>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={!canSubmit} className={`${primaryButton} w-full`}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {onEnterDemo && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-200" />
                <span className="text-xs uppercase tracking-wider text-neutral-400">or</span>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>

              <button
                type="button"
                onClick={onEnterDemo}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-sunken px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-neutral-300 hover:bg-neutral-200/70 ${focusRing}`}
              >
                <Play className="h-3.5 w-3.5 text-neutral-600" aria-hidden />
                Preview Interactive Demo (No Login)
              </button>
            </>
          )}
        </div>
      </main>

      <EditorialFooter />
    </div>
  );
}
