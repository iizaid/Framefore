import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { isSupabaseConfigured } from "@/lib/supabase";
import { buildFromState, isEmailVerified } from "@/lib/authAccess";
import { useAuthStore } from "@/store/useAuthStore";

type AppAccessGuardProps = {
  children: ReactNode;
};

// Gate for /app. The workspace is no longer public — a visitor must be signed
// in AND email-verified before any project data renders.
//
// No-flicker contract: AppWorkspacePage must never mount until auth has
// initialized, a user exists, and the email is verified. Every "not yet
// allowed" branch returns *before* children, so there is no one-frame flash of
// the workspace for signed-out or unverified visitors. This guard never touches
// local project data — it only decides whether to render the workspace.
export function AppAccessGuard({ children }: AppAccessGuardProps) {
  const location = useLocation();
  const authInitialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);

  // 1. Auth still settling → compact loading state (no workspace).
  if (!authInitialized) {
    return <AppAccessLoading />;
  }

  // 2. Supabase not configured → there is no way to sign in, so we cannot grant
  //    workspace access. Show a friendly unavailable state instead of /app.
  if (!isSupabaseConfigured) {
    return <AppAccessUnavailable />;
  }

  // 3. Signed out → bounce to login, preserving the attempted destination so a
  //    successful sign-in returns here.
  if (!user) {
    return <Navigate to="/login" replace state={buildFromState(location)} />;
  }

  // 4. Signed in but email not verified → send to the verify-email screen,
  //    keeping the intended destination for after they confirm.
  if (!isEmailVerified(user)) {
    return <Navigate to="/verify-email" replace state={buildFromState(location)} />;
  }

  // 5. Signed in and verified → render the workspace.
  return <>{children}</>;
}

// A delayed spinner: quick auth resolutions (the common case on reload) show
// nothing, matching the workspace's own boot behavior to avoid flicker.
function AppAccessLoading() {
  const [showSpinner, setShowSpinner] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShowSpinner(true), 220);
    return () => window.clearTimeout(t);
  }, []);

  if (!showSpinner) return <div className="min-h-screen bg-[var(--color-bg)]" />;
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-bg)]">
      <div className="flex items-center gap-2.5 text-sm text-[var(--color-ink-soft)]">
        <Loader2 size={16} className="animate-spin" />
        Checking your session…
      </div>
    </div>
  );
}

function AppAccessUnavailable() {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm text-center">
        <img src="/black.svg" alt="Framefore" className="mx-auto h-9 w-9" />
        <h1 className="mt-5 font-display text-2xl text-[var(--ff-ink)]">Workspace unavailable</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          Accounts are temporarily unavailable, so the workspace can't be opened right now. Please try again later.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
