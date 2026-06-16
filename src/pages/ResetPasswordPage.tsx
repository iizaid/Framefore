import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { AuthLayout } from "@/components/auth/AuthLayout";

const MIN_PASSWORD = 6;

// Where a Supabase password-reset email link lands. The link establishes a
// temporary recovery session; this page lets the user set a new password with it.
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword, loading } = useAuthStore();

  // null = still checking, true/false = whether a valid reset session exists.
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setHasSession(false);
      return;
    }

    let mounted = true;
    const client = supabase;

    // The recovery session may still be settling from the URL; check now, and
    // also listen for the PASSWORD_RECOVERY event Supabase fires on arrival.
    const subscription = client.auth.onAuthStateChange((_e, session) => {
      if (mounted && session) setHasSession(true);
    }).data.subscription;

    (async () => {
      const { data } = await client.auth.getSession();
      if (mounted && data.session) setHasSession(true);
    })();

    const timeout = setTimeout(() => {
      // No session arrived → link is invalid/expired.
      if (mounted) setHasSession((prev) => (prev === null ? false : prev));
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) return setError("Password is required.");
    if (password.length < MIN_PASSWORD) {
      return setError(`Password must be at least ${MIN_PASSWORD} characters.`);
    }
    if (password !== confirm) return setError("Passwords do not match.");

    const { error } = await updatePassword(password);
    if (error) setError(error);
    else setDone(true);
  };

  return (
    <AuthLayout>
      {done ? (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--ff-ink)]">
              Password updated
            </h1>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              Your password has been updated. You can continue to the app.
            </p>
          </div>
          <button
            onClick={() => navigate("/app", { replace: true })}
            className="flex h-11 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--ff-carbon)] text-sm font-semibold text-white transition-colors hover:bg-[var(--ff-haiti)]"
          >
            Continue to app
          </button>
          <Link to="/login" className="text-center text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
            Back to sign in
          </Link>
        </div>
      ) : hasSession === false ? (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--ff-ink)]">
              Reset link invalid
            </h1>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              This reset link is invalid or has expired. Request a new password reset from the
              sign-in page.
            </p>
          </div>
          <Link
            to="/login"
            className="flex h-11 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--ff-carbon)] text-sm font-semibold text-white transition-colors hover:bg-[var(--ff-haiti)]"
          >
            Back to sign in
          </Link>
        </div>
      ) : hasSession === null ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--ff-violet)]" />
          <p className="text-sm text-[var(--color-ink-soft)]">Verifying your reset link…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--ff-ink)]">
              Set a new password
            </h1>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              Choose a new password for your Framefore account.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Field
              id="new-password"
              label="New password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder={`Min. ${MIN_PASSWORD} characters`}
              autoComplete="new-password"
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
            <Field
              id="confirm-password"
              label="Confirm new password"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={setConfirm}
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-11 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--ff-carbon)] text-sm font-semibold text-white transition-colors hover:bg-[var(--ff-haiti)] disabled:opacity-40"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Update password"
              )}
            </button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  rightSlot,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
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
          autoComplete={autoComplete}
          required
          dir="auto"
          className={cn(
            "h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-white px-4 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)]",
            "outline-none transition-shadow",
            "focus:border-[var(--ff-violet)] focus:shadow-[0_0_0_3px_rgba(131,77,251,0.14)]",
            rightSlot && "pr-11"
          )}
        />
        {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
    </div>
  );
}
