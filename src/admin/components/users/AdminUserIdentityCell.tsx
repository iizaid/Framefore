import type { AdminUsersListItem } from "@/admin/types";

type AdminUserIdentityCellProps = {
  user: AdminUsersListItem;
};

// Derives a small avatar placeholder from the display name or email. We never
// render an uploaded avatar here — avatar_path is intentionally not part of the
// Users list contract.
function initialsFor(user: AdminUsersListItem): string {
  const source = user.displayName ?? user.email ?? "";
  const cleaned = source.trim();
  if (cleaned === "") return "?";

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function AdminUserIdentityCell({ user }: AdminUserIdentityCellProps) {
  const primary = user.displayName ?? user.email ?? "Unknown user";
  const secondary = user.displayName ? user.email : null;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-button)] bg-[var(--ff-blue-chalk)] text-[11px] font-semibold text-[var(--ff-violet)]"
      >
        {initialsFor(user)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--ff-ink)]">{primary}</p>
        {secondary && <p className="truncate text-xs text-[var(--color-ink-soft)]">{secondary}</p>}
      </div>
    </div>
  );
}
