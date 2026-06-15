import { supabase } from "@/lib/supabase";
import type { AdminRole, AdminRoleActionResult } from "@/admin/types";

function getSupabaseErrorMessage(error: unknown): string {
  return typeof error === "object" && error && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : "";
}

function getSupabaseErrorCode(error: unknown): string {
  return typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}

function isPermissionError(error: unknown) {
  const code = getSupabaseErrorCode(error);
  const message = getSupabaseErrorMessage(error).toLowerCase();
  return (
    code === "42501" ||
    code === "insufficient_privilege" ||
    message.includes("only an owner") ||
    message.includes("only an admin") ||
    message.includes("admin access required")
  );
}

function isLastOwnerError(error: unknown) {
  return getSupabaseErrorMessage(error).toLowerCase().includes("cannot remove the last owner");
}

export async function grantUserRole(target_user: string, new_role: AdminRole): Promise<AdminRoleActionResult> {
  if (!supabase) {
    return { ok: false, error: "Supabase client not configured" };
  }

  try {
    const { error } = await supabase.rpc("grant_app_role", { target_user, new_role });
    if (error) {
      console.warn("grantUserRole error:", error);
      if (isPermissionError(error)) {
        return { ok: false, error: "You do not have permission to grant this role." };
      }
      return { ok: false, error: "Failed to grant role. The action was rejected by the server." };
    }
    return { ok: true, error: null };
  } catch (err) {
    console.warn("Unexpected error in grantUserRole:", err);
    return { ok: false, error: "An unexpected error occurred while granting the role." };
  }
}

export async function revokeUserRole(target_user: string, old_role: AdminRole): Promise<AdminRoleActionResult> {
  if (!supabase) {
    return { ok: false, error: "Supabase client not configured" };
  }

  try {
    const { error } = await supabase.rpc("revoke_app_role", { target_user, old_role });
    if (error) {
      console.warn("revokeUserRole error:", error);
      if (isPermissionError(error)) {
        return { ok: false, error: "You do not have permission to revoke this role." };
      }
      if (isLastOwnerError(error)) {
        return { ok: false, error: "Cannot remove the last owner. The system requires at least one owner." };
      }
      return { ok: false, error: "Failed to revoke role. The action was rejected by the server." };
    }
    return { ok: true, error: null };
  } catch (err) {
    console.warn("Unexpected error in revokeUserRole:", err);
    return { ok: false, error: "An unexpected error occurred while revoking the role." };
  }
}
