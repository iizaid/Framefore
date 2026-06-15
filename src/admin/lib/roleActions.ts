import { supabase } from "@/lib/supabase";
import type { AdminRole, AdminRoleActionResult } from "@/admin/types";

export async function grantUserRole(target_user: string, new_role: AdminRole): Promise<AdminRoleActionResult> {
  if (!supabase) {
    return { ok: false, error: "Supabase client not configured" };
  }

  try {
    const { error } = await supabase.rpc("grant_app_role", { target_user, new_role });
    if (error) {
      console.warn("grantUserRole error:", error);
      if (error.code === "insufficient_privilege" || error.message.includes("only an owner") || error.message.includes("only an admin")) {
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
      if (error.code === "insufficient_privilege" || error.message.includes("only an owner") || error.message.includes("only an admin")) {
        return { ok: false, error: "You do not have permission to revoke this role." };
      }
      if (error.message.includes("cannot remove the last owner")) {
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
