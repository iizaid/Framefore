import { Link } from "react-router-dom";
import { Button } from "@/components/ui/primitives";
import { AuthShell, ProviderButtons } from "@/components/landing/AuthShell";

export function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to Framefore"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-[var(--color-ink)] hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <ProviderButtons />
      <div className="mt-5 border-t border-[var(--color-border)] pt-5 text-center">
        <p className="mb-3 text-xs text-[var(--color-ink-soft)]">
          You can use Framefore right now without an account.
        </p>
        <Link to="/app">
          <Button variant="primary" size="md" className="w-full">
            Open the app
          </Button>
        </Link>
      </div>
    </AuthShell>
  );
}
