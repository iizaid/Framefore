import { useEffect, useRef, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { MAX_USERS_SEARCH_LENGTH } from "@/admin/lib/users";
import {
  USERS_PAGE_SIZES,
  filterToProfileCompleted,
  profileCompletedToFilter,
  type ProfileCompletedFilter,
  type UsersPageSize,
} from "@/admin/hooks/useAdminUsersQueryParams";
import { ADMIN_ROLES, type AdminRole } from "@/admin/types";

type AdminUsersToolbarProps = {
  search: string | null;
  role: AdminRole | null;
  profileCompleted: boolean | null;
  pageSize: UsersPageSize;
  isFiltered: boolean;
  disabled?: boolean;
  onSearchChange: (value: string | null) => void;
  onRoleChange: (value: AdminRole | null) => void;
  onProfileCompletedChange: (value: boolean | null) => void;
  onPageSizeChange: (value: UsersPageSize) => void;
  onReset: () => void;
};

const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  admin: "Admin",
  support: "Support",
  reviewer: "Reviewer",
};

const SELECT_CLASS =
  "rounded-lg border border-[#dedbd3] bg-white px-3 py-2 text-sm text-[#333333] shadow-[0_1px_1px_rgba(0,0,0,0.02)] disabled:cursor-not-allowed disabled:opacity-60";

export function AdminUsersToolbar({
  search,
  role,
  profileCompleted,
  pageSize,
  isFiltered,
  disabled = false,
  onSearchChange,
  onRoleChange,
  onProfileCompletedChange,
  onPageSizeChange,
  onReset,
}: AdminUsersToolbarProps) {
  // Local input mirrors the URL search but is debounced before it commits, so
  // typing doesn't fire a request (or a history entry) per keystroke.
  const [searchInput, setSearchInput] = useState(search ?? "");
  const committedRef = useRef(search ?? "");

  // Keep the input in sync when the URL changes externally (reset, back/forward).
  useEffect(() => {
    const next = search ?? "";
    committedRef.current = next;
    setSearchInput(next);
  }, [search]);

  const tooLong = searchInput.trim().length > MAX_USERS_SEARCH_LENGTH;

  useEffect(() => {
    if (tooLong) return; // do not commit an invalid value
    const trimmed = searchInput.trim();
    const normalized = trimmed === "" ? null : trimmed;
    if ((committedRef.current === "" ? null : committedRef.current) === normalized) return;

    const timer = window.setTimeout(() => {
      committedRef.current = normalized ?? "";
      onSearchChange(normalized);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, tooLong, onSearchChange]);

  return (
    <div className="rounded-2xl border border-[#e6e4de] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <label htmlFor="admin-users-search" className="sr-only">
            Search users by email or display name
          </label>
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#77756f]"
            />
            <input
              id="admin-users-search"
              type="search"
              inputMode="search"
              autoComplete="off"
              maxLength={MAX_USERS_SEARCH_LENGTH + 20}
              value={searchInput}
              disabled={disabled}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search email or display name"
              aria-invalid={tooLong}
              className="w-full rounded-lg border border-[#dedbd3] bg-white py-2 pl-9 pr-3 text-sm text-[#333333] shadow-[0_1px_1px_rgba(0,0,0,0.02)] placeholder:text-[#8a8983] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          {tooLong && (
            <p className="mt-1.5 text-xs text-[#b42318]">
              Search must be {MAX_USERS_SEARCH_LENGTH} characters or fewer.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="admin-users-role" className="text-xs font-medium text-[#6b6b66]">
              Role
            </label>
            <select
              id="admin-users-role"
              className={SELECT_CLASS}
              value={role ?? "all"}
              disabled={disabled}
              onChange={(event) => {
                const value = event.target.value;
                onRoleChange(value === "all" ? null : (value as AdminRole));
              }}
            >
              <option value="all">All roles</option>
              {ADMIN_ROLES.map((option) => (
                <option key={option} value={option}>
                  {ROLE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="admin-users-profile" className="text-xs font-medium text-[#6b6b66]">
              Profile
            </label>
            <select
              id="admin-users-profile"
              className={SELECT_CLASS}
              value={profileCompletedToFilter(profileCompleted)}
              disabled={disabled}
              onChange={(event) =>
                onProfileCompletedChange(filterToProfileCompleted(event.target.value as ProfileCompletedFilter))
              }
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="admin-users-page-size" className="text-xs font-medium text-[#6b6b66]">
              Page size
            </label>
            <select
              id="admin-users-page-size"
              className={SELECT_CLASS}
              value={pageSize}
              disabled={disabled}
              onChange={(event) => onPageSizeChange(Number(event.target.value) as UsersPageSize)}
            >
              {USERS_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onReset}
            disabled={disabled || !isFiltered}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#dedbd3] bg-white px-3 py-2 text-sm font-medium text-[#333333] hover:bg-[#f7f7f5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
