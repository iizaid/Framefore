import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuthStore } from "@/store/useAuthStore";

export function SignupPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  return (
    <AuthLayout>
      <AuthForm
        mode="signup"
        heading="Create your Framefore account"
        subtext="Start building your AI video plans scene by scene."
        submitLabel="Create account"
        onSuccess={() => navigate("/app", { replace: true })}
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
