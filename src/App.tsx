import { useEffect, useLayoutEffect, lazy, Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toast";
import { AdminGuard } from "@/admin/components/AdminGuard";
import { useAdminRoleStore } from "@/admin/store/useAdminRoleStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/store/useStore";

// Route-level code splitting. Each page is its own chunk, so the initial load
// only ships the route the user actually landed on (the heavy workspace/canvas
// code no longer weighs down the landing page, etc.). Pages render their own
// loading/skeleton states, so the Suspense fallback only covers the brief
// chunk-fetch and stays minimal to avoid flicker.
const LandingPage = lazy(() => import("@/pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const AppWorkspacePage = lazy(() => import("@/pages/AppWorkspacePage").then((m) => ({ default: m.AppWorkspacePage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("@/pages/SignupPage").then((m) => ({ default: m.SignupPage })));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage").then((m) => ({ default: m.AuthCallbackPage })));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const ProfilePage = lazy(() => import("@/pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const AdminPage = lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })));

// Route map:
//   /              → public landing page
//   /app           → Framefore workspace (local-first, no auth gate yet)
//   /login         → login
//   /signup        → signup
//   /auth/callback → OAuth / signup-confirmation return target
//   /reset-password→ set a new password from a reset email link
//   /admin         → guarded admin placeholder
//   /pricing       → scrolls to pricing section on landing
//
// /app remains open so local projects are never disrupted before cloud sync.
// Keeps the project store's owner filter in sync with the auth session. New
// projects are tagged with this id and the projects list is filtered by it.
// Lives at the app root so it applies everywhere (landing, /app, /profile) and
// keeps useStore free of any auth import (no circular dependency).
function useSyncProjectOwner() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const initialized = useAuthStore((s) => s.initialized);
  useEffect(() => {
    // Wait until auth has settled so a signed-in user isn't briefly treated as a
    // guest on first paint. When Supabase is unconfigured, init() flips
    // `initialized` immediately with a null user → guest context, as intended.
    if (initialized) useStore.getState().setCurrentOwnerUserId(userId);
  }, [userId, initialized]);
}

// Admin access uses the signed-in caller's roles only. Layout effect lets an
// account switch clear stale admin state before the browser paints /admin.
function useSyncAdminRoles() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const authInitialized = useAuthStore((s) => s.initialized);
  const loadRoles = useAdminRoleStore((s) => s.loadRoles);
  const resetRoles = useAdminRoleStore((s) => s.reset);

  useLayoutEffect(() => {
    if (!authInitialized) return;
    if (userId) {
      void loadRoles();
      return;
    }
    resetRoles();
  }, [authInitialized, loadRoles, resetRoles, userId]);
}

export default function App() {
  useSyncProjectOwner();
  useSyncAdminRoles();
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<AppWorkspacePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
          <Route path="/pricing" element={<Navigate to="/#pricing" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}

function RouteFallback() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 180);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-bg)]">
      {show && (
        <div className="flex items-center gap-2.5 text-sm text-[var(--color-ink-soft)]">
          <Loader2 size={16} className="animate-spin" />
          Loading…
        </div>
      )}
    </div>
  );
}
