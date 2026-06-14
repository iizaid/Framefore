import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toast";
import { AppWorkspacePage } from "@/pages/AppWorkspacePage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { AdminPage } from "@/pages/AdminPage";

// Top-level routing.
//
//   /        → public marketing landing page
//   /app     → the Framefore workspace (projects + canvas + export)
//   /login   → placeholder auth (real auth lands in Phase 4.2)
//   /signup  → placeholder auth
//   /admin   → placeholder admin shell
//   /pricing → scrolls to the pricing section on the landing page
//
// Phase 4.2 will wrap /app and /admin in an auth guard. The route boundaries are
// laid out now so that change is additive, not a rewrite.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AppWorkspacePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/admin" element={<AdminPage />} />
        {/* /pricing is a scroll target on the landing page. */}
        <Route path="/pricing" element={<Navigate to="/#pricing" replace />} />
        {/* Unknown paths fall back to the landing page. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
