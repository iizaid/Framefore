import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toast";
import { AppWorkspacePage } from "@/pages/AppWorkspacePage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
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
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AppWorkspacePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/pricing" element={<Navigate to="/#pricing" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
