import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";
import { getPostAuthRedirectTarget, isEmailVerified } from "@/lib/authAccess";
import { useAuthStore } from "@/store/useAuthStore";

export function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  // If signup returns a session immediately (email confirmation disabled), the
  // user becomes set: verified → workspace, unverified → verify-email. When
  // confirmation is required no session exists, so AuthForm's onNeedsConfirmation
  // drives the redirect instead (below).
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
        mode="signup"
        heading="Create your Framefore account"
        subtext="Start building your AI video plans scene by scene."
        submitLabel="Create account"
        onSuccess={() => {/* navigation handled by the user-watching effect */}}
        onNeedsConfirmation={(email) =>
          navigate("/verify-email", { replace: true, state: { email } })
        }
        footer={
          <>
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-[var(--color-ink)] hover:underline">
              Sign in
            </Link>
          </>
        }
      />
    </AuthLayout>
  );
}
