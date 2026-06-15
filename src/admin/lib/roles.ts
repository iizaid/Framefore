import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { ADMIN_ROLES, type AdminResult, type AdminRole, type CurrentAdminRoles } from "@/admin/types";

export const EMPTY_CURRENT_ADMIN_ROLES: CurrentAdminRoles = {
  roles: [],
  isOwner: false,
  isAdmin: false,
  canAccessAdmin: false,
};

const ROLE_ORDER = new Map<AdminRole, number>(ADMIN_ROLES.map((role, index) => [role, index]));
const ROLE_SET = new Set<string>(ADMIN_ROLES);

function logAdminRoleError(context: string, error: unknown) {
  if (import.meta.env.DEV) {
    console.warn(`[admin roles] ${context}`, error);
  }
}

function friendlyAdminRoleError(): string {
  return "Admin roles are unavailable right now.";
}

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && ROLE_SET.has(value);
}

export function getCanAccessAdmin(isOwner: boolean, isAdmin: boolean): boolean {
  return isOwner || isAdmin;
}

function normalizeRoles(values: readonly unknown[]): AdminRole[] {
  const seen = new Set<AdminRole>();
  for (const value of values) {
    if (isAdminRole(value)) seen.add(value);
  }
  return [...seen].sort((a, b) => (ROLE_ORDER.get(a) ?? 99) - (ROLE_ORDER.get(b) ?? 99));
}

export async function getCurrentAdminRoles(): Promise<AdminResult<CurrentAdminRoles>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: EMPTY_CURRENT_ADMIN_ROLES, error: null };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logAdminRoleError("Could not verify the current user.", userError);
    return { data: EMPTY_CURRENT_ADMIN_ROLES, error: null };
  }

  if (!user) {
    return { data: EMPTY_CURRENT_ADMIN_ROLES, error: null };
  }

  const { data: roleRows, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (rolesError) {
    logAdminRoleError("Could not load current-user role rows.", rolesError);
    return { data: EMPTY_CURRENT_ADMIN_ROLES, error: friendlyAdminRoleError() };
  }

  const roles = normalizeRoles((roleRows ?? []).map((row) => row.role));
  const [ownerResult, adminResult] = await Promise.all([supabase.rpc("is_owner"), supabase.rpc("is_admin")]);

  if (adminResult.error) {
    logAdminRoleError("Could not evaluate admin access.", adminResult.error);
    return {
      data: { roles, isOwner: false, isAdmin: false, canAccessAdmin: false },
      error: friendlyAdminRoleError(),
    };
  }

  if (ownerResult.error) {
    logAdminRoleError("Could not evaluate owner access.", ownerResult.error);
  }

  const isOwner = ownerResult.error ? roles.includes("owner") : Boolean(ownerResult.data);
  const isAdmin = Boolean(adminResult.data);

  return {
    data: {
      roles,
      isOwner,
      isAdmin,
      canAccessAdmin: isOwner || isAdmin,
    },
    error: null,
  };
}
