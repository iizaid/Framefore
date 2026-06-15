import type { User } from "@supabase/supabase-js";

// Centralized auth-access rules for the verified-account gate.
//
// These helpers are the single source of truth for two questions:
//   1. "Is this Supabase user actually verified?" (isEmailVerified)
//   2. "Where should we send them after authenticating?" (getPostAuthRedirectTarget)
//
// Keeping the logic here (not scattered across guards/pages) means there is one
// place to audit the verification boundary. We only trust server-issued Supabase
// user fields — never localStorage flags, never free-text profile fields, never
// provider tokens.

export const DEFAULT_POST_AUTH_PATH = "/app";

// Routes we must never redirect *back into* after auth. Bouncing a freshly
// signed-in user to /login or /verify-email would create navigation loops.
const NON_RETURNABLE_PATHS = new Set([
  "/login",
  "/signup",
  "/verify-email",
  "/auth/callback",
  "/reset-password",
]);

/**
 * True only when Supabase reports the user's email/account as confirmed.
 *
 * Supabase sets `email_confirmed_at` once the email is verified (and
 * `confirmed_at` once any identity is confirmed). OAuth providers that hand back
 * a confirmed email populate these too, so OAuth users pass without a separate
 * code path. When confirmation is disabled in the Supabase project, signup
 * auto-confirms and these fields are populated immediately — so this stays
 * correct in both configurations.
 */
export function isEmailVerified(user: User | null | undefined): boolean {
  if (!user) return false;
  return Boolean(user.email_confirmed_at ?? user.confirmed_at);
}

/**
 * A path is a safe redirect target only if it is an internal, non-auth route.
 * Rejecting protocol-relative (`//evil.com`) and backslash (`/\evil.com`) forms
 * closes the open-redirect hole; rejecting auth routes prevents loops.
 */
export function isSafeInternalPath(path: string): boolean {
  if (typeof path !== "string" || !path.startsWith("/")) return false;
  if (path.startsWith("//") || path.startsWith("/\\")) return false;
  const pathOnly = path.split(/[?#]/, 1)[0];
  if (NON_RETURNABLE_PATHS.has(pathOnly)) return false;
  return true;
}

// React Router lets us stash an attempted destination in `location.state`.
// Guards write either a string (`from: "/app#/project/x"`) or an object
// (`from: { pathname, search, hash }`); normalize both to a single path string.
function readFromState(state: unknown): string | null {
  if (!state || typeof state !== "object") return null;
  const from = (state as { from?: unknown }).from;

  if (typeof from === "string") return from;

  if (from && typeof from === "object") {
    const o = from as { pathname?: unknown; search?: unknown; hash?: unknown };
    const pathname = typeof o.pathname === "string" ? o.pathname : "";
    if (!pathname) return null;
    const search = typeof o.search === "string" ? o.search : "";
    const hash = typeof o.hash === "string" ? o.hash : "";
    return pathname + search + hash;
  }

  return null;
}

/**
 * Resolve where to send a freshly authenticated user. Uses the preserved
 * "from" destination when it is a safe internal route, otherwise falls back to
 * the workspace. Pass `location.state` (from `useLocation()`).
 */
export function getPostAuthRedirectTarget(state: unknown): string {
  const from = readFromState(state);
  if (from && isSafeInternalPath(from)) return from;
  return DEFAULT_POST_AUTH_PATH;
}

/**
 * Build the router `state` used when redirecting an unauthenticated/unverified
 * visitor away from a protected route, so we can return them afterwards.
 */
export function buildFromState(location: {
  pathname: string;
  search: string;
  hash: string;
}): { from: string } {
  return { from: location.pathname + location.search + location.hash };
}
