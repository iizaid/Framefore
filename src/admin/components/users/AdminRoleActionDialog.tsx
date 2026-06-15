import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ShieldAlert, CheckCircle2, Shield, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useAdminRoleStore } from "@/admin/store/useAdminRoleStore";
import { grantUserRole, revokeUserRole } from "@/admin/lib/roleActions";
import { adminQueryKeys } from "@/admin/lib/queryKeys";
import type { AdminRole } from "@/admin/types";

const ALL_ROLES: AdminRole[] = ["owner", "admin", "support", "reviewer"];

type AdminRoleActionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  email: string | null;
  displayName: string | null;
  currentRoles: AdminRole[];
};

export function AdminRoleActionDialog({
  isOpen,
  onClose,
  userId,
  email,
  displayName,
  currentRoles,
}: AdminRoleActionDialogProps) {
  const queryClient = useQueryClient();
  const currentAuthUserId = useAuthStore((s) => s.user?.id);
  const loadRoles = useAdminRoleStore((s) => s.loadRoles);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmingRole, setConfirmingRole] = useState<{ role: AdminRole; action: "grant" | "revoke" } | null>(null);

  const displayEmail = email || "No email";

  const grantMutation = useMutation({
    mutationFn: (role: AdminRole) => grantUserRole(userId, role),
    onSuccess: async (result, role) => {
      if (!result.ok) {
        setErrorMsg(result.error);
        return;
      }
      setSuccessMsg(`Successfully granted ${role} to ${displayEmail}.`);
      await handleSuccessRefresh();
    },
    onError: () => {
      setErrorMsg("An unexpected error occurred while processing the request.");
    },
    onSettled: () => setConfirmingRole(null),
  });

  const revokeMutation = useMutation({
    mutationFn: (role: AdminRole) => revokeUserRole(userId, role),
    onSuccess: async (result, role) => {
      if (!result.ok) {
        setErrorMsg(result.error);
        return;
      }
      setSuccessMsg(`Successfully revoked ${role} from ${displayEmail}.`);
      await handleSuccessRefresh();
    },
    onError: () => {
      setErrorMsg("An unexpected error occurred while processing the request.");
    },
    onSettled: () => setConfirmingRole(null),
  });

  async function handleSuccessRefresh() {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users.all });
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.overview() });
    if (currentAuthUserId === userId) {
      await loadRoles();
    }
  }

  if (!isOpen) return null;

  const isWorking = grantMutation.isPending || revokeMutation.isPending;

  function handleActionClick(role: AdminRole, action: "grant" | "revoke") {
    setErrorMsg(null);
    setSuccessMsg(null);
    setConfirmingRole({ role, action });
  }

  function handleConfirm() {
    if (!confirmingRole) return;
    if (confirmingRole.action === "grant") grantMutation.mutate(confirmingRole.role);
    if (confirmingRole.action === "revoke") revokeMutation.mutate(confirmingRole.role);
  }

  function handleCancelConfirm() {
    setConfirmingRole(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-[#e8e8ec]">
        <button
          type="button"
          onClick={onClose}
          disabled={isWorking}
          className="absolute right-4 top-4 text-[#9ca3af] hover:text-[#111111] disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111111]">Manage Roles</h2>
              <p className="text-sm text-[#6b7280]">
                {displayName ? `${displayName} (${displayEmail})` : displayEmail}
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-700">
              <ShieldAlert size={16} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
          )}

          {confirmingRole ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-semibold text-amber-900">Confirm Action</h3>
              <p className="mt-1 text-sm text-amber-800">
                {confirmingRole.action === "grant"
                  ? `Grant ${confirmingRole.role} to ${displayEmail}? This action will be audited.`
                  : `Revoke ${confirmingRole.role} from ${displayEmail}? This action will be audited.`}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isWorking}
                  className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {isWorking && <Loader2 size={14} className="animate-spin" />}
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={handleCancelConfirm}
                  disabled={isWorking}
                  className="rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {ALL_ROLES.map((role) => {
                const hasRole = currentRoles.includes(role);
                const isSelfDemoting =
                  currentAuthUserId === userId && hasRole && (role === "owner" || role === "admin");

                return (
                  <div
                    key={role}
                    className="flex items-center justify-between rounded-xl border border-[#e8e8ec] p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#111111] capitalize">{role}</p>
                      {isSelfDemoting && (
                        <p className="mt-0.5 text-xs text-red-600">
                          You cannot revoke your own critical admin role from this console.
                        </p>
                      )}
                    </div>
                    {hasRole ? (
                      <button
                        type="button"
                        onClick={() => handleActionClick(role, "revoke")}
                        disabled={isSelfDemoting || isWorking}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleActionClick(role, "grant")}
                        disabled={isWorking}
                        className="rounded-lg bg-[#f3f4f6] px-3 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#e5e7eb] disabled:opacity-50"
                      >
                        Grant
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
