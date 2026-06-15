import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getPostAuthRedirectTarget, isEmailVerified } from "@/lib/authAccess";
import { useAuthStore } from "@/store/useAuthStore";

// Landing place after signup (and the redirect target for any signed-in but
// unverified user who tries to open /app). Gives a calm, honest screen to
// confirm email, resend the confirmation, or re-check verification — without
// ever faking verification or letting an unverified user into the workspace.
export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useAuthStore((s) => s.user);
  const resendConfirmation = useAuthStore((s) => s.resendConfirmation);
  const reloadUser = useAuthStore((s) => s.reloadUser);

  // An email passed via router state (from signup needing confirmation, when no
  // session exists yet) lets us show *which* address to check even before sign-in.
  const stateEmail = (location.state as { email?: unknown } | null)?.email;
  const pendingEmail = typeof stateEmail === "string" ? stateEmail : null;
  const email = user?.email ?? pendingEmail;

  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  // Already verified? Don't linger here — forward to the intended destination.
  useEffect(() => {
    if (user && isEmailVerified(user)) {
      navigate(getPostAuthRedirectTarget(location.state), { replace: true });
    }
  }, [user, navigate, location.state]);

  const handleResend = async () => {
    if (!email) return;
    setResendState("sending");
    setResendError(null);
    const { error } = await resendConfirmation(email);
    if (error) {
      setResendState("error");
      setResendError(error);
      return;
    }
    setResendState("sent");
  };

  // Re-check verification on demand. We refresh the session so the new JWT
  // reflects email_confirmed_at, then only proceed to /app if truly verified.
  const handleContinue = async () => {
    setChecking(true);
    setCheckMessage(null);
    const refreshed = await reloadUser();
    setChecking(false);
    if (refreshed && isEmailVerified(refreshed)) {
      navigate(getPostAuthRedirectTarget(location.state), { replace: true });
      return;
    }
    setCheckMessage("We can't confirm your email yet. Open the link in your inbox, then try again.");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 py-12 text-center">
      <img src="/black.svg" alt="Framefore" className="h-9 w-9" />

      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-stone-surface)] text-[var(--color-charcoal)]">
          <MailCheck size={22} />
        </div>
        <h1 className="font-display text-2xl text-[var(--color-charcoal)]">Verify your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
          Check your inbox and confirm your email before opening the workspace.
        </p>
        {email && (
          <p className="mt-3 truncate text-sm font-medium text-[var(--color-ink)]">{email}</p>
        )}
      </div>

      {/* Status banners */}
      {resendState === "sent" && (
        <div className="w-full max-w-sm rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Confirmation email sent. Check your inbox (and spam folder).
        </div>
      )}
      {resendState === "error" && resendError && (
        <div className="w-full max-w-sm rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {resendError}
        </div>
      )}
      {checkMessage && (
        <div className="w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {checkMessage}
        </div>
      )}

      {/* Continue requires a signed-in session; resend only needs a known email. */}
      <div className="flex w-full max-w-sm flex-col gap-3">
        {user && (
          <button
            type="button"
            onClick={handleContinue}
            disabled={checking}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-charcoal)] text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {checking ? <Loader2 size={16} className="animate-spin" /> : "I verified my email — continue"}
          </button>
        )}

        {email && (
          <button
            type="button"
            onClick={handleResend}
            disabled={!isSupabaseConfigured || resendState === "sending"}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border-strong)] text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-stone-surface)] disabled:opacity-40"
          >
            {resendState === "sending" ? <Loader2 size={16} className="animate-spin" /> : "Resend confirmation email"}
          </button>
        )}

        {!user && (
          <p className="text-sm text-[var(--color-ink-soft)]">
            After confirming your email, sign in to continue.
          </p>
        )}

        <Link
          to="/login"
          className="text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
        >
          Back to sign in
        </Link>
        <Link
          to="/"
          className="text-xs text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink-soft)]"
        >
          Return to home
        </Link>
      </div>
    </div>
  );
}
