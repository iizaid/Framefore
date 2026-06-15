import { useAuthStore } from "@/store/useAuthStore";
import { isEmailVerified } from "@/lib/authAccess";

export type WorkspaceCta = {
  /** Auth-aware destination for a "go to the product" CTA. */
  to: string;
  /** Suggested label for the primary CTA. */
  label: string;
  signedIn: boolean;
  verified: boolean;
};

// Single place that decides where a "Start planning / Open app" CTA should
// point based on the viewer's auth state. Now that /app is gated, a signed-out
// CTA must route to /signup (account creation) — never directly to /app, which
// would just bounce off AppAccessGuard.
//
//   signed out            → /signup       ("Start planning")
//   signed in, unverified → /verify-email ("Verify email")
//   signed in, verified   → /app          ("Open app")
//
// This is UX routing only; AppAccessGuard remains the real protection.
export function useWorkspaceCta(): WorkspaceCta {
  const user = useAuthStore((s) => s.user);
  const signedIn = Boolean(user);
  const verified = isEmailVerified(user);

  if (!signedIn) {
    return { to: "/signup", label: "Start planning", signedIn, verified };
  }
  if (!verified) {
    return { to: "/verify-email", label: "Verify email", signedIn, verified };
  }
  return { to: "/app", label: "Open app", signedIn, verified };
}
