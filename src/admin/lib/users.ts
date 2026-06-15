import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { adminUsersListSchema } from "@/admin/lib/users.schema";
import { ADMIN_ROLES, type AdminRole, type AdminUsersListResult } from "@/admin/types";

export interface LoadAdminUsersOptions {
  search?: string | null;
  role?: AdminRole | null;
  profileCompleted?: boolean | null;
  limit?: number | null;
  offset?: number | null;
}

export type AdminUsersListLoadResult = {
  data: AdminUsersListResult | null;
  error: string | null;
  unavailable?: boolean;
};

const ROLE_SET = new Set<string>(ADMIN_ROLES);

// Keep these in sync with the server-side guards in
// supabase/migrations/0011_admin_users_list_hardening.sql.
export const MAX_USERS_SEARCH_LENGTH = 100;
export const MAX_USERS_OFFSET = 10000;

function logUsersError(context: string, error: unknown) {
  if (import.meta.env.DEV) {
    console.warn(`[admin users] ${context}`, error);
  }
}

function normalizeLimit(limit: number | null | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return 25;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

function normalizeOffset(offset: number | null | undefined): number {
  if (typeof offset !== "number" || !Number.isFinite(offset)) return 0;
  return Math.max(Math.trunc(offset), 0);
}

function normalizeSearch(search: string | null | undefined): string | null {
  if (typeof search !== "string") return null;
  const trimmed = search.trim();
  return trimmed === "" ? null : trimmed;
}

function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && ROLE_SET.has(value);
}

// Runtime validation lives in users.schema.ts. The schema drops invalid user
// rows (e.g. empty userId) and filters unknown roles; a structurally wrong
// payload returns null so callers fall back to a safe "unavailable" state.
// Raw Zod issue details are only logged in dev.
function parseUsersList(value: unknown): AdminUsersListResult | null {
  const result = adminUsersListSchema.safeParse(value);
  if (!result.success) {
    logUsersError("Users list failed schema validation.", result.error.issues);
    return null;
  }
  return result.data;
}

function friendlyUsersError(error: { code?: string; message?: string }): AdminUsersListLoadResult {
  if (error.code === "42501" || /permission|forbidden|admin access/i.test(error.message ?? "")) {
    return { data: null, error: "You do not have access to admin users." };
  }

  if (error.code === "22023" || /invalid role filter/i.test(error.message ?? "")) {
    return { data: null, error: "Invalid users filter.", unavailable: true };
  }

  if (error.code === "PGRST202" || /admin_list_users/i.test(error.message ?? "")) {
    return {
      data: null,
      error: "Admin users list is not available until the latest database migration is applied.",
      unavailable: true,
    };
  }

  return { data: null, error: "Admin users list is temporarily unavailable.", unavailable: true };
}

export async function loadAdminUsers(options: LoadAdminUsersOptions = {}): Promise<AdminUsersListLoadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: "Admin users list needs Supabase to be configured.",
      unavailable: true,
    };
  }

  const role = options.role ?? null;
  if (role !== null && !isAdminRole(role)) {
    return { data: null, error: "Invalid users filter.", unavailable: true };
  }

  const search = normalizeSearch(options.search);
  if (search !== null && search.length > MAX_USERS_SEARCH_LENGTH) {
    return { data: null, error: "Search is too long.", unavailable: true };
  }

  const offset = normalizeOffset(options.offset);
  if (offset > MAX_USERS_OFFSET) {
    return { data: null, error: "You have paged too far. Refine your filters.", unavailable: true };
  }

  const { data, error } = await supabase.rpc("admin_list_users", {
    p_search: search,
    p_role: role,
    p_profile_completed: typeof options.profileCompleted === "boolean" ? options.profileCompleted : null,
    p_limit: normalizeLimit(options.limit),
    p_offset: offset,
  });

  if (error) {
    logUsersError("Could not load users list.", error);
    return friendlyUsersError(error);
  }

  const usersList = parseUsersList(data);
  if (!usersList) {
    logUsersError("Users list RPC returned an unexpected shape.", data);
    return { data: null, error: "Admin users list returned an unexpected shape.", unavailable: true };
  }

  return { data: usersList, error: null };
}
