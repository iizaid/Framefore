import { useEffect, lazy, Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toast";
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
//   /login         → split-screen login  (Phase 4.2)
//   /signup        → split-screen signup (Phase 4.2)
//   /auth/callback → OAuth / signup-confirmation return target (Phase 4.2)
//   /reset-password→ set a new password from a reset email link (Phase 4.2)
//   /admin         → admin shell placeholder
//   /pricing       → scrolls to pricing section on landing
//
// Phase 4.3 will add a <ProtectedRoute> wrapper around /app and /admin once
// the cloud-sync migration is ready. For now /app remains open so local projects
// are never disrupted during the auth rollout.
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

export default function App() {
  useSyncProjectOwner();
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
          <Route path="/admin" element={<AdminPage />} />
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
