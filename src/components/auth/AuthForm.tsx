import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { OAuthButtons } from "./OAuthButtons";

// Supabase's default minimum password length. Keep client validation aligned
// with the server so users see the error before a round-trip.
const MIN_PASSWORD = 6;

// ── Shared input ────────────────────────────────────────────────────────────
function AuthInput({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  rightSlot,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-ink)]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          dir="auto"
          className={cn(
            "h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-white px-4 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)]",
            "outline-none transition-shadow",
            "focus:border-[var(--ff-violet)] focus:shadow-[0_0_0_3px_rgba(131,77,251,0.14)]",
            rightSlot && "pr-11"
          )}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

// ── Error / success banners ──────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="shrink-0 text-red-400 hover:text-red-600" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
      {message}
    </div>
  );
}

// ── Main form ────────────────────────────────────────────────────────────────
interface AuthFormProps {
  mode: "login" | "signup";
  heading: string;
  subtext: string;
  submitLabel: string;
  onSuccess: () => void;
  /**
   * Signup-only: called when Supabase requires email confirmation (no session
   * yet). The page uses this to route to /verify-email instead of showing an
   * inline banner. Falls back to the inline banner when not provided.
   */
  onNeedsConfirmation?: (email: string) => void;
  footer: React.ReactNode;
}

export function AuthForm({ mode, heading, subtext, submitLabel, onSuccess, onNeedsConfirmation, footer }: AuthFormProps) {
  const { signIn, signUp, requestPasswordReset, loading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Inline "forgot password" — toggles a single email field instead of a route.
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const disabled = loading || !isSupabaseConfigured;

  const resetMessages = () => {
    clearError();
    setLocalError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email.trim()) return setLocalError("Email is required.");
    if (!password) return setLocalError("Password is required.");

    if (mode === "login") {
      const { error } = await signIn(email.trim(), password);
      if (!error) onSuccess();
      return;
    }

    // signup-specific validation
    if (password.length < MIN_PASSWORD) {
      return setLocalError(`Password must be at least ${MIN_PASSWORD} characters.`);
    }
    if (password !== confirm) {
      return setLocalError("Passwords do not match.");
    }

    const { error, needsConfirmation } = await signUp(email.trim(), password);
    if (!error) {
      if (needsConfirmation) {
        // Hand off to the page (→ /verify-email). Fall back to an inline banner
        // if no handler was provided.
        if (onNeedsConfirmation) {
          onNeedsConfirmation(email.trim());
        } else {
          setSuccessMsg("Check your email to confirm your account, then sign in.");
        }
      } else {
        onSuccess();
      }
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!email.trim()) return setLocalError("Enter your email to reset your password.");
    const { error } = await requestPasswordReset(email.trim());
    if (!error) setResetSent(true);
  };

  const shownError = localError ?? error;

  return (
    <div className="flex flex-col gap-8">
      {/* Heading */}
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-charcoal)]">{heading}</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{subtext}</p>
      </div>

      {successMsg && <SuccessBanner message={successMsg} />}
      {shownError && <ErrorBanner message={shownError} onDismiss={resetMessages} />}

      {resetMode ? (
        // ── Forgot-password inline form ──────────────────────────────────────
        resetSent ? (
          <div className="flex flex-col gap-4">
            <SuccessBanner message="Check your email — if that address is registered, a password reset link is on its way." />
            <button
              type="button"
              onClick={() => {
                setResetMode(false);
                setResetSent(false);
                resetMessages();
              }}
              className="text-center text-sm font-medium text-[var(--color-ink)] hover:underline"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4" noValidate>
            <AuthInput
              id="reset-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={disabled}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-[var(--ff-carbon)] text-sm font-semibold text-white transition-colors hover:bg-[var(--ff-haiti)] disabled:opacity-40"
            >
              {loading ? <Spinner /> : "Send reset link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setResetMode(false);
                resetMessages();
              }}
              className="text-center text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
            >
              Back to sign in
            </button>
          </form>
        )
      ) : (
        // ── Normal login / signup ────────────────────────────────────────────
        <>
          <OAuthButtons mode={mode} />

          {isSupabaseConfigured && (
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
              <span className="text-xs text-[var(--color-ink-faint)]">or continue with email</span>
              <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <AuthInput
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <AuthInput
              id="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder={mode === "signup" ? `Min. ${MIN_PASSWORD} characters` : "Your password"}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            {mode === "signup" && (
              <AuthInput
                id="confirm"
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={setConfirm}
                placeholder="Re-enter password"
                required
                autoComplete="new-password"
              />
            )}

            {mode === "login" && isSupabaseConfigured && (
              <button
                type="button"
                onClick={() => {
                  setResetMode(true);
                  resetMessages();
                }}
                className="-mt-1 self-end text-xs font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:underline"
              >
                Forgot password?
              </button>
            )}

            {!isSupabaseConfigured && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                Accounts are temporarily unavailable.
              </div>
            )}

            <button
              type="submit"
              disabled={disabled}
              className="mt-1 flex h-11 w-full items-center justify-center rounded-xl bg-[var(--ff-carbon)] text-sm font-semibold text-white transition-colors hover:bg-[var(--ff-haiti)] disabled:opacity-40"
            >
              {loading ? <Spinner /> : submitLabel}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--color-ink-soft)]">{footer}</p>
        </>
      )}
    </div>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />;
}
