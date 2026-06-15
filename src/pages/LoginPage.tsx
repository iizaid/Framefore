import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";
import { getPostAuthRedirectTarget, isEmailVerified } from "@/lib/authAccess";
import { useAuthStore } from "@/store/useAuthStore";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  // Navigation is driven by the user becoming set (after sign-in or if already
  // signed in), so an unverified user is never sent to /app for a frame: a
  // verified user goes to the intended destination (or /app); an unverified one
  // goes to /verify-email.
  useEffect(() => {
    if (!user) return;
    if (isEmailVerified(user)) {
      navigate(getPostAuthRedirectTarget(location.state), { replace: true });
    } else {
      navigate("/verify-email", { replace: true, state: location.state });
    }
  }, [user, navigate, location.state]);

  return (
    <AuthLayout>
      <AuthForm
        mode="login"
        heading="Welcome back"
        subtext="Sign in to continue planning your AI video workflow."
        submitLabel="Sign in"
        onSuccess={() => {/* navigation handled by the user-watching effect */}}
        footer={
          <>
            Don't have an account?{" "}
            <Link to="/signup" state={location.state} className="font-medium text-[var(--color-ink)] hover:underline">
              Create one
            </Link>
          </>
        }
      />
    </AuthLayout>
  );
}
