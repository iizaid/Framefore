import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// Landing spot for OAuth (Google/GitHub) and password-reset redirects.
// supabase-js auto-detects the session in the URL (detectSessionInUrl), so we
// just wait for it to settle, then forward into the workspace.
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setError("Sign in is temporarily unavailable.");
      return;
    }

    let mounted = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let subscription: { unsubscribe: () => void } | undefined;
    const client = supabase;

    // Provider can return an error in the URL (query or hash fragment).
    const params = new URLSearchParams(
      window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.search
    );
    const urlError = params.get("error_description") || params.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
      return;
    }

    (async () => {
      const { data, error } = await client.auth.getSession();
      if (!mounted) return;
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        navigate("/app", { replace: true });
        return;
      }

      // Session may still be exchanging — wait for the auth state to flip.
      subscription = client.auth.onAuthStateChange((_e, session) => {
        if (mounted && session) navigate("/app", { replace: true });
      }).data.subscription;

      // Safety net: if nothing arrives, send the user back to sign in.
      timeout = setTimeout(() => {
        if (mounted) setError("We couldn't finish signing you in. Please try again.");
      }, 8000);
    })();

    // Returned synchronously so React actually runs it on unmount.
    return () => {
      mounted = false;
      if (timeout) clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-white px-6 text-center">
      <img src="/black.svg" alt="Framefore" className="h-9 w-9" />
      {error ? (
        <>
          <p className="text-sm text-red-600">{error}</p>
          <Link to="/login" className="text-sm font-medium text-[var(--color-ink)] hover:underline">
            Back to sign in
          </Link>
        </>
      ) : (
        <>
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-charcoal)]" />
          <p className="text-sm text-[var(--color-ink-soft)]">Finishing sign in…</p>
        </>
      )}
    </div>
  );
}
