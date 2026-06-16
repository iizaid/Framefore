import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useAdminRoleStore } from "@/admin/store/useAdminRoleStore";
import { grantUserRole, revokeUserRole } from "@/admin/lib/roleActions";
import { adminQueryKeys } from "@/admin/lib/queryKeys";
import type { AdminRole } from "@/admin/types";

// ─── Role metadata ────────────────────────────────────────────────────────────
const ROLE_META: Record<AdminRole, { label: string; description: string }> = {
  owner: {
    label: "Owner",
    description: "Full platform control. Can manage critical owner/admin roles.",
  },
  admin: {
    label: "Admin",
    description: "Admin console access. Can manage operational roles.",
  },
  support: {
    label: "Support",
    description:
      "Support role reserved for assisted workflows. No console access in MVP.",
  },
  reviewer: {
    label: "Reviewer",
    description:
      "Review/moderation role reserved for future workflows. No console access in MVP.",
  },
};

const ALL_ROLES: AdminRole[] = ["owner", "admin", "support", "reviewer"];

// ─── Types ────────────────────────────────────────────────────────────────────
type ConfirmState = { role: AdminRole; action: "grant" | "revoke" } | null;

type Props = {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  email: string | null;
  displayName: string | null;
  currentRoles: AdminRole[];
};

// ─── Popover position ─────────────────────────────────────────────────────────
function usePopoverPosition(
  anchorRef: React.RefObject<HTMLButtonElement | null>,
  isOpen: boolean,
) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) {
      setPos(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    setPos({
      top: rect.bottom + 6,
      // Anchor to right edge of the button, clamped to 12px from left
      right: Math.max(12, viewportWidth - rect.right),
    });
  }, [anchorRef, isOpen]);

  return pos;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AdminRoleActionPopover({
  anchorRef,
  isOpen,
  onClose,
  userId,
  email,
  displayName,
  currentRoles,
}: Props) {
  const queryClient = useQueryClient();
  const currentAuthUserId = useAuthStore((s) => s.user?.id);
  const loadRoles = useAdminRoleStore((s) => s.loadRoles);
  const isCurrentUserOwner = useAdminRoleStore((s) => s.isOwner);

  const popoverRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState<ConfirmState>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pos = usePopoverPosition(anchorRef, isOpen);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen, onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Reset state when popover opens
  useEffect(() => {
    if (isOpen) {
      setConfirming(null);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const displayEmail = email ?? "No email";
  const identity = displayName ? `${displayName} (${displayEmail})` : displayEmail;

  // ─── Mutations ──────────────────────────────────────────────────────────────
  async function handleSuccessRefresh() {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users.all });
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.overview() });
    if (currentAuthUserId === userId) await loadRoles();
  }

  const grantMutation = useMutation({
    mutationFn: (role: AdminRole) => grantUserRole(userId, role),
    onSuccess: async (result, role) => {
      setConfirming(null);
      if (!result.ok) { setErrorMsg(result.error); return; }
      setSuccessMsg(`Granted ${role} to ${displayEmail}.`);
      await handleSuccessRefresh();
    },
    onError: () => {
      setConfirming(null);
      setErrorMsg("An unexpected error occurred while processing the request.");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (role: AdminRole) => revokeUserRole(userId, role),
    onSuccess: async (result, role) => {
      setConfirming(null);
      if (!result.ok) { setErrorMsg(result.error); return; }
      setSuccessMsg(`Revoked ${role} from ${displayEmail}.`);
      await handleSuccessRefresh();
    },
    onError: () => {
      setConfirming(null);
      setErrorMsg("An unexpected error occurred while processing the request.");
    },
  });

  const isWorking = grantMutation.isPending || revokeMutation.isPending;

  function handleActionClick(role: AdminRole, action: "grant" | "revoke") {
    setErrorMsg(null);
    setSuccessMsg(null);
    setConfirming({ role, action });
  }

  function handleConfirm() {
    if (!confirming) return;
    if (confirming.action === "grant") grantMutation.mutate(confirming.role);
    else revokeMutation.mutate(confirming.role);
  }

  if (!isOpen || !pos) return null;

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Manage roles"
      aria-modal="false"
      style={{
        position: "fixed",
        top: pos.top,
        right: pos.right,
        zIndex: 50,
        width: "min(360px, calc(100vw - 24px))",
      }}
      className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-[var(--ff-shadow-card)]"
    >
      {/* Header */}
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--ff-ink)]">Manage roles</p>
        <p className="mt-0.5 truncate text-xs text-[var(--color-ink-faint)]" title={identity}>
          {identity}
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--color-ink-faint)]">Changes are audited.</p>
      </div>

      {/* Feedback */}
      {errorMsg && (
        <div className="flex items-start gap-2 border-b border-[var(--color-border)] bg-red-50 px-4 py-2.5 text-red-700">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <p className="text-xs font-medium">{errorMsg}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-2 border-b border-[var(--color-border)] bg-emerald-50 px-4 py-2.5 text-emerald-700">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <p className="text-xs font-medium">{successMsg}</p>
        </div>
      )}

      {/* Role rows */}
      <div className="max-h-[min(480px,calc(100vh-120px))] divide-y divide-[var(--color-border)] overflow-y-auto">
        {ALL_ROLES.map((role) => {
          const meta = ROLE_META[role];
          const hasRole = currentRoles.includes(role);
          const isCritical = role === "owner" || role === "admin";
          const isSelfDemoting = isCritical && hasRole && currentAuthUserId === userId;
          const isOwnerOnlyBlocked = isCritical && !isCurrentUserOwner;
          const isConfirmingThis = confirming?.role === role;
          const disableAction = isWorking || isSelfDemoting || isOwnerOnlyBlocked;

          return (
            <div key={role} className="px-4 py-3">
              {/* Role info + primary action */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold capitalize text-[var(--ff-ink)]">
                      {meta.label}
                    </span>
                    {hasRole && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f0fdf4] px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <Check size={9} />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-ink-faint)]">
                    {meta.description}
                  </p>
                  {isSelfDemoting && (
                    <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
                      You cannot revoke your own critical admin role from this console.
                    </p>
                  )}
                  {!isSelfDemoting && isOwnerOnlyBlocked && (
                    <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
                      Only owners can change owner/admin roles.
                    </p>
                  )}
                </div>

                {!isConfirmingThis && (
                  <button
                    type="button"
                    disabled={disableAction}
                    onClick={() => handleActionClick(role, hasRole ? "revoke" : "grant")}
                    className={
                      hasRole
                        ? "shrink-0 rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
                        : "shrink-0 rounded-lg bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--ff-blue-chalk)] disabled:opacity-40"
                    }
                  >
                    {hasRole ? "Revoke" : "Grant"}
                  </button>
                )}
              </div>

              {/* Inline confirmation */}
              {isConfirmingThis && (
                <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                  <p className="text-[11px] font-medium text-[var(--color-ink-soft)]">
                    {confirming.action === "grant"
                      ? `Grant ${role} to ${displayEmail}?`
                      : `Revoke ${role} from ${displayEmail}?`}
                  </p>
                  <p className="text-[11px] text-[var(--color-ink-faint)]">This action will be audited.</p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={isWorking}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--ff-carbon)] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--ff-haiti)] disabled:opacity-50"
                    >
                      {isWorking && <Loader2 size={11} className="animate-spin" />}
                      {confirming.action === "grant" ? "Confirm grant" : "Confirm revoke"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      disabled={isWorking}
                      className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[11px] font-medium text-[var(--color-ink-faint)] hover:bg-[var(--color-surface-2)] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
