import type { AdminRole } from "@/admin/types";

// Stable, serializable query keys for admin server-state.
//
// Keys are the cache identity for TanStack Query: two calls share a cache entry
// iff their keys are deeply equal. So every input that changes the result must
// appear in the key, and equivalent inputs must normalize to the same value
// (e.g. "  " and "" and null all collapse to null) to avoid cache fragmentation
// and duplicate fetches. These keys are intentionally plain JSON.

export interface AdminUsersListKeyParams {
  search?: string | null;
  role?: AdminRole | null;
  profileCompleted?: boolean | null;
  limit?: number | null;
  offset?: number | null;
}

// The normalized, fully-resolved filter shape that goes into the key. Keeping
// this explicit (rather than spreading raw params) guarantees a deterministic
// key regardless of property order or undefined-vs-null differences.
export interface AdminUsersListKeyFilters {
  search: string | null;
  role: AdminRole | null;
  profileCompleted: boolean | null;
  limit: number | null;
  offset: number | null;
}

function normalizeKeySearch(search: string | null | undefined): string | null {
  if (typeof search !== "string") return null;
  const trimmed = search.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeKeyNumber(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

export function normalizeAdminUsersListFilters(
  params: AdminUsersListKeyParams = {},
): AdminUsersListKeyFilters {
  return {
    search: normalizeKeySearch(params.search),
    role: params.role ?? null,
    profileCompleted: typeof params.profileCompleted === "boolean" ? params.profileCompleted : null,
    limit: normalizeKeyNumber(params.limit),
    offset: normalizeKeyNumber(params.offset),
  };
}

export const adminQueryKeys = {
  all: ["admin"] as const,
  overview: () => ["admin", "overview"] as const,
  users: {
    all: ["admin", "users"] as const,
    list: (params: AdminUsersListKeyParams = {}) =>
      ["admin", "users", "list", normalizeAdminUsersListFilters(params)] as const,
  },
} as const;
