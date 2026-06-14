import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// OAuth + password-reset both redirect the browser back here. The dedicated
// /auth/callback route lets Supabase finish exchanging the code for a session
// before we forward the user into /app.
const AUTH_REDIRECT = `${window.location.origin}/auth/callback`;

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;

  // Actions
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithGitHub: () => Promise<{ error: string | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
  clearError: () => void;
}

// Guards against binding the onAuthStateChange listener more than once if init()
// is ever invoked again (HMR, double render, etc.). One subscription, ever.
let authListenerBound = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,
  error: null,

  init: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ initialized: true });
      return;
    }

    // Get current session on mount (restores a logged-in user across reloads).
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, initialized: true });

    // Listen for future auth changes (login, logout, token refresh, OAuth return).
    if (!authListenerBound) {
      authListenerBound = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
      });
    }
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: "Auth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY." };

    set({ loading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });

    if (error) {
      const msg = error.message ?? "Sign in failed.";
      set({ error: msg });
      return { error: msg };
    }
    return { error: null };
  },

  signUp: async (email, password) => {
    if (!supabase) return { error: "Auth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY." };

    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: AUTH_REDIRECT },
    });
    set({ loading: false });

    if (error) {
      const msg = error.message ?? "Sign up failed.";
      set({ error: msg });
      return { error: msg };
    }

    // Supabase returns a session immediately if email confirmation is disabled.
    // If confirmation is required, session is null and the user must verify first.
    const needsConfirmation = !data.session;
    return { error: null, needsConfirmation };
  },

  signOut: async () => {
    if (!supabase) return;
    set({ loading: true });
    await supabase.auth.signOut();
    set({ user: null, session: null, loading: false });
  },

  signInWithGoogle: async () => {
    if (!supabase) return { error: "Auth is not configured." };
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: AUTH_REDIRECT },
    });
    // On success the browser navigates away, so we only reach here on error.
    if (error) {
      set({ loading: false, error: error.message });
      return { error: error.message };
    }
    return { error: null };
  },

  signInWithGitHub: async () => {
    if (!supabase) return { error: "Auth is not configured." };
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: AUTH_REDIRECT },
    });
    if (error) {
      set({ loading: false, error: error.message });
      return { error: error.message };
    }
    return { error: null };
  },

  requestPasswordReset: async (email) => {
    if (!supabase) return { error: "Auth is not configured." };
    set({ loading: true, error: null });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: AUTH_REDIRECT,
    });
    set({ loading: false });
    if (error) {
      set({ error: error.message });
      return { error: error.message };
    }
    return { error: null };
  },

  resendConfirmation: async (email) => {
    if (!supabase) return { error: "Auth is not configured." };
    set({ loading: true, error: null });
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: AUTH_REDIRECT },
    });
    set({ loading: false });
    if (error) {
      set({ error: error.message });
      return { error: error.message };
    }
    return { error: null };
  },

  clearError: () => set({ error: null }),
}));

// Call init once when the module loads so auth state is ready before first render.
useAuthStore.getState().init();
