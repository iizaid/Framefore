import { QueryClient } from "@tanstack/react-query";

// Production-minded QueryClient for admin server-state only.
//
// Scope note: this client is for the Admin Console's TanStack Query usage
// (overview, and the upcoming Users/Audit/Security tables). Auth/profile/admin
// access flags and all local app state stay in Zustand — see
// docs/admin-dashboard/platform-1-admin-server-state-foundation.md.

// Admin RPCs fail closed on access/validation problems. Retrying those is
// pointless and only generates noisy network loops, so we treat a known set of
// non-transient error signals as non-retryable.
const NON_RETRYABLE_CODES = new Set(["42501", "22023", "PGRST202"]);
const NON_RETRYABLE_MESSAGE = /permission|forbidden|admin access|invalid .*filter|not available|unexpected shape/i;

export function isRetryableAdminError(error: unknown): boolean {
  if (!error || typeof error !== "object") return true;

  const { code, message } = error as { code?: unknown; message?: unknown };

  if (typeof code === "string" && NON_RETRYABLE_CODES.has(code)) return false;
  if (typeof message === "string" && NON_RETRYABLE_MESSAGE.test(message)) return false;

  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Server data is fresh for 30s before a background refetch is allowed.
      staleTime: 30_000,
      // Keep unused query data cached for 5 minutes before garbage collection.
      gcTime: 5 * 60_000,
      // Admin tables are opened intentionally; focus refetch churn is unwanted.
      refetchOnWindowFocus: false,
      // Retry transient failures up to twice, but never hammer a forbidden or
      // invalid-filter response.
      retry: (failureCount, error) => isRetryableAdminError(error) && failureCount < 2,
    },
    mutations: {
      // Admin mutations (future phases) must not silently re-fire; surface the
      // error and let the operator decide.
      retry: 0,
    },
  },
});
