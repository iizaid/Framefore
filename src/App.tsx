import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toast";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/store/useStore";
import { AppWorkspacePage } from "@/pages/AppWorkspacePage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { AdminPage } from "@/pages/AdminPage";

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
      <Toaster />
    </BrowserRouter>
  );
}
