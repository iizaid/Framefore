import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

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
          className={cn(
            "h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-white px-4 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)]",
            "outline-none transition-shadow",
            "focus:border-[var(--color-charcoal)] focus:shadow-[0_0_0_3px_rgba(52,52,51,0.1)]",
            rightSlot && "pr-11"
          )}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}

// ── OAuth buttons ────────────────────────────────────────────────────────────
function OAuthButtons({ mode }: { mode: "login" | "signup" }) {
  const { signInWithGoogle, signInWithGitHub, loading } = useAuthStore();
  const label = mode === "login" ? "Continue" : "Sign up";

  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-stone-surface)] px-4 py-3 text-center text-xs text-[var(--color-ink-soft)]">
        OAuth not configured — add{" "}
        <code className="font-mono text-[var(--color-ink)]">VITE_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-[var(--color-ink)]">VITE_SUPABASE_ANON_KEY</code> to enable.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => signInWithGoogle()}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--color-border-strong)] bg-white text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-stone-surface)] disabled:opacity-50"
      >
        {/* Google G icon */}
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
          <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
          <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
          <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
        </svg>
        {label} with Google
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={() => signInWithGitHub()}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--color-border-strong)] bg-white text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-stone-surface)] disabled:opacity-50"
      >
        {/* GitHub icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.6-4.04-1.6-.55-1.38-1.34-1.75-1.34-1.75-1.08-.74.08-.73.08-.73 1.2.08 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.48 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        {label} with GitHub
      </button>
    </div>
  );
}

// ── Error banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
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
  footer: React.ReactNode;
}

export function AuthForm({ mode, heading, subtext, submitLabel, onSuccess, footer }: AuthFormProps) {
  const { signIn, signUp, loading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (!error) onSuccess();
    } else {
      const { error, needsConfirmation } = await signUp(email, password);
      if (!error) {
        if (needsConfirmation) {
          setSuccessMsg("Check your email to confirm your account, then sign in.");
        } else {
          onSuccess();
        }
      }
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Heading */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-charcoal)]">
          {heading}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{subtext}</p>
      </div>

      {/* Success message (after signup with email confirm) */}
      {successMsg && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Error banner */}
      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {/* OAuth */}
      <OAuthButtons mode={mode} />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
        <span className="text-xs text-[var(--color-ink-faint)]">or continue with email</span>
        <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
      </div>

      {/* Email / password form */}
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
          placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
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

        {!isSupabaseConfigured && (
          <p className="text-xs text-[var(--color-ink-faint)]">
            Supabase not configured — email auth is disabled.
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !isSupabaseConfigured}
          className="mt-1 flex h-11 w-full items-center justify-center rounded-xl bg-[var(--color-charcoal)] text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            submitLabel
          )}
        </button>
      </form>

      {/* Footer link (login ↔ signup) */}
      <p className="text-center text-sm text-[var(--color-ink-soft)]">{footer}</p>
    </div>
  );
}
