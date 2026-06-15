import { isSupabaseConfigured, supabase } from "@/lib/supabase";
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

type JsonRecord = Record<string, unknown>;

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

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
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

function asRoleArray(value: unknown): AdminRole[] {
  if (!Array.isArray(value)) return [];

  const roles: AdminRole[] = [];
  for (const role of value) {
    if (isAdminRole(role) && !roles.includes(role)) {
      roles.push(role);
    }
  }
  return roles;
}

function asNullableRole(value: unknown): AdminRole | null {
  return isAdminRole(value) ? value : null;
}

function parseUsersList(value: unknown): AdminUsersListResult | null {
  if (!isRecord(value)) return null;

  const page = isRecord(value.page) ? value.page : {};
  const filters = isRecord(value.filters) ? value.filters : {};
  const users = Array.isArray(value.users) ? value.users : [];

  return {
    generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : new Date().toISOString(),
    sourceVersion: "phase-f1",
    page: {
      limit: asNumber(page.limit),
      offset: asNumber(page.offset),
      returned: asNumber(page.returned),
      total: asNumber(page.total),
      hasMore: asBoolean(page.hasMore),
    },
    filters: {
      search: asNullableString(filters.search),
      role: asNullableRole(filters.role),
      profileCompleted: asNullableBoolean(filters.profileCompleted),
    },
    users: users
      .filter(isRecord)
      .map((user) => {
        const userId = asString(user.userId).trim();
        if (userId === "") return null;

        const roles = asRoleArray(user.roles);
        return {
          userId,
          email: asNullableString(user.email),
          displayName: asNullableString(user.displayName),
          createdAt: asString(user.createdAt),
          lastSignInAt: asNullableString(user.lastSignInAt),
          profileCompleted: asBoolean(user.profileCompleted),
          hasUploadedAvatar: asBoolean(user.hasUploadedAvatar),
          roles,
          isOwner: asBoolean(user.isOwner) || roles.includes("owner"),
          isAdmin: asBoolean(user.isAdmin) || roles.includes("owner") || roles.includes("admin"),
        };
      })
      .filter((user): user is AdminUsersListResult["users"][number] => user !== null),
  };
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
