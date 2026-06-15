import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MAX_USERS_OFFSET, MAX_USERS_SEARCH_LENGTH } from "@/admin/lib/users";
import { ADMIN_ROLES, type AdminRole } from "@/admin/types";

// URL search params are the single source of truth for the Users list filters
// and pagination, so refresh / back / shared links reproduce the exact same
// query (and the same TanStack Query cache entry). This hook reads + normalizes
// those params and exposes safe setters that always reset the page when a filter
// changes.

export const USERS_PAGE_SIZES = [10, 25, 50, 100] as const;
export type UsersPageSize = (typeof USERS_PAGE_SIZES)[number];

export const DEFAULT_USERS_PAGE_SIZE: UsersPageSize = 25;

export type ProfileCompletedFilter = "all" | "completed" | "incomplete";

export interface AdminUsersQueryState {
  search: string | null;
  role: AdminRole | null;
  profileCompleted: boolean | null;
  limit: UsersPageSize;
  offset: number;
}

const ROLE_SET = new Set<string>(ADMIN_ROLES);

function normalizeSearchParam(raw: string | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  // Defensive: never let an over-length value reach the query/RPC.
  return trimmed.slice(0, MAX_USERS_SEARCH_LENGTH);
}

function normalizeRoleParam(raw: string | null): AdminRole | null {
  if (typeof raw !== "string") return null;
  const lower = raw.trim().toLowerCase();
  return ROLE_SET.has(lower) ? (lower as AdminRole) : null;
}

function normalizeProfileCompletedParam(raw: string | null): boolean | null {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

function normalizeLimitParam(raw: string | null): UsersPageSize {
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && (USERS_PAGE_SIZES as readonly number[]).includes(Math.trunc(parsed))) {
    return Math.trunc(parsed) as UsersPageSize;
  }
  return DEFAULT_USERS_PAGE_SIZE;
}

function normalizeOffsetParam(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(Math.trunc(parsed), 0), MAX_USERS_OFFSET);
}

export function profileCompletedToFilter(value: boolean | null): ProfileCompletedFilter {
  if (value === true) return "completed";
  if (value === false) return "incomplete";
  return "all";
}

export function filterToProfileCompleted(value: ProfileCompletedFilter): boolean | null {
  if (value === "completed") return true;
  if (value === "incomplete") return false;
  return null;
}

export interface UseAdminUsersQueryParams extends AdminUsersQueryState {
  isFiltered: boolean;
  setSearch: (value: string | null) => void;
  setRole: (value: AdminRole | null) => void;
  setProfileCompleted: (value: boolean | null) => void;
  setPageSize: (value: UsersPageSize) => void;
  setOffset: (value: number) => void;
  resetFilters: () => void;
}

export function useAdminUsersQueryParams(): UseAdminUsersQueryParams {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo<AdminUsersQueryState>(
    () => ({
      search: normalizeSearchParam(searchParams.get("q")),
      role: normalizeRoleParam(searchParams.get("role")),
      profileCompleted: normalizeProfileCompletedParam(searchParams.get("profileCompleted")),
      limit: normalizeLimitParam(searchParams.get("limit")),
      offset: normalizeOffsetParam(searchParams.get("offset")),
    }),
    [searchParams],
  );

  // Build the next params from the current ones, then apply the mutation. Any
  // filter change resets offset to 0 so the user never lands on an empty page.
  const update = useCallback(
    (mutate: (next: URLSearchParams) => void, options?: { keepOffset?: boolean }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          if (!options?.keepOffset) next.delete("offset");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setSearch = useCallback(
    (value: string | null) => {
      update((next) => {
        const normalized = normalizeSearchParam(value);
        if (normalized) next.set("q", normalized);
        else next.delete("q");
      });
    },
    [update],
  );

  const setRole = useCallback(
    (value: AdminRole | null) => {
      update((next) => {
        if (value && ROLE_SET.has(value)) next.set("role", value);
        else next.delete("role");
      });
    },
    [update],
  );

  const setProfileCompleted = useCallback(
    (value: boolean | null) => {
      update((next) => {
        if (value === true) next.set("profileCompleted", "true");
        else if (value === false) next.set("profileCompleted", "false");
        else next.delete("profileCompleted");
      });
    },
    [update],
  );

  const setPageSize = useCallback(
    (value: UsersPageSize) => {
      update((next) => {
        if (value === DEFAULT_USERS_PAGE_SIZE) next.delete("limit");
        else next.set("limit", String(value));
      });
    },
    [update],
  );

  const setOffset = useCallback(
    (value: number) => {
      const clamped = Math.min(Math.max(Math.trunc(value), 0), MAX_USERS_OFFSET);
      update(
        (next) => {
          if (clamped === 0) next.delete("offset");
          else next.set("offset", String(clamped));
        },
        { keepOffset: true },
      );
    },
    [update],
  );

  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const isFiltered = state.search !== null || state.role !== null || state.profileCompleted !== null;

  return {
    ...state,
    isFiltered,
    setSearch,
    setRole,
    setProfileCompleted,
    setPageSize,
    setOffset,
    resetFilters,
  };
}
