import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

// Google + GitHub OAuth buttons. Both kick off Supabase's OAuth redirect flow;
// the browser leaves the page and returns to /auth/callback once authorized.
export function OAuthButtons({ mode }: { mode: "login" | "signup" }) {
  const { signInWithGoogle, signInWithGitHub, loading } = useAuthStore();
  const label = mode === "login" ? "Continue" : "Sign up";

  if (!isSupabaseConfigured) {
    return null;
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
          <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
          <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
          <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
          <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
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
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.6-4.04-1.6-.55-1.38-1.34-1.75-1.34-1.75-1.08-.74.08-.73.08-.73 1.2.08 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.48 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
        {label} with GitHub
      </button>
    </div>
  );
}
