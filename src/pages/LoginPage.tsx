import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuthStore } from "@/store/useAuthStore";

export function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // Already signed in? Skip the form and go straight to the workspace.
  useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  return (
    <AuthLayout>
      <AuthForm
        mode="login"
        heading="Welcome back"
        subtext="Sign in to continue planning your AI video workflow."
        submitLabel="Sign in"
        onSuccess={() => navigate("/app", { replace: true })}
        footer={
          <>
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-[var(--color-ink)] hover:underline">
              Create one
            </Link>
          </>
        }
      />
    </AuthLayout>
  );
}
