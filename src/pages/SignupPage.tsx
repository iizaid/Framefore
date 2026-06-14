import { Link } from "react-router-dom";
import { Button } from "@/components/ui/primitives";
import { AuthShell, ProviderButtons } from "@/components/landing/AuthShell";

export function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start planning AI videos with Framefore"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[var(--color-ink)] hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <ProviderButtons />
      <div className="mt-5 border-t border-[var(--color-border)] pt-5 text-center">
        <p className="mb-3 text-xs text-[var(--color-ink-soft)]">
          No sign-up required — projects save to your browser today.
        </p>
        <Link to="/app">
          <Button variant="primary" size="md" className="w-full">
            Start planning free
          </Button>
        </Link>
      </div>
    </AuthShell>
  );
}
