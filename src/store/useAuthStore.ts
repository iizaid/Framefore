import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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
  clearError: () => void;
}

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

    // Get current session on mount
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, initialized: true });

    // Listen for future auth changes (login, logout, token refresh)
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
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
    const { data, error } = await supabase.auth.signUp({ email, password });
    set({ loading: false });

    if (error) {
      const msg = error.message ?? "Sign up failed.";
      set({ error: msg });
      return { error: msg };
    }

    // Supabase returns a session immediately if email confirmation is disabled.
    // If confirmation is required, session is null and user has identities array.
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) return { error: error.message };
    return { error: null };
  },

  signInWithGitHub: async () => {
    if (!supabase) return { error: "Auth is not configured." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) return { error: error.message };
    return { error: null };
  },

  clearError: () => set({ error: null }),
}));

// Call init once when the module loads so auth state is ready before first render.
useAuthStore.getState().init();
