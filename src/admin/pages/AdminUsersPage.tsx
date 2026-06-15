import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/admin/components/AdminLayout";
import { AdminUsersEmptyState } from "@/admin/components/users/AdminUsersEmptyState";
import { AdminUsersErrorState } from "@/admin/components/users/AdminUsersErrorState";
import { AdminUsersPagination } from "@/admin/components/users/AdminUsersPagination";
import { AdminUsersSkeleton } from "@/admin/components/users/AdminUsersSkeleton";
import { AdminUsersTable } from "@/admin/components/users/AdminUsersTable";
import { AdminUsersToolbar } from "@/admin/components/users/AdminUsersToolbar";
import { useAdminUsersQueryParams } from "@/admin/hooks/useAdminUsersQueryParams";
import { adminQueryKeys } from "@/admin/lib/queryKeys";
import { loadAdminUsers } from "@/admin/lib/users";

function countActiveFilters(search: string | null, role: unknown, profileCompleted: boolean | null) {
  return [search, role, profileCompleted].filter((v) => v !== null && v !== "").length;
}

export function AdminUsersPage() {
  const params = useAdminUsersQueryParams();
  const { search, role, profileCompleted, limit, offset } = params;

  const query = useQuery({
    queryKey: adminQueryKeys.users.list({ search, role, profileCompleted, limit, offset }),
    queryFn: () => loadAdminUsers({ search, role, profileCompleted, limit, offset }),
    placeholderData: (prev) => prev,
  });

  const result = query.data;
  const showSkeleton = query.isLoading && !result;
  const isRefreshing = query.isFetching && !query.isLoading;
  const data = result?.data ?? null;
  const activeFiltersCount = countActiveFilters(search, role, profileCompleted);

  return (
    <AdminLayout>
      <div className="space-y-5">

        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#111111]">Users</h1>
            <p className="mt-0.5 text-sm text-[#9ca3af]">
              Account access, profile status, and admin roles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#e8e8ec] bg-white px-4 py-2 text-sm font-medium text-[#374151] shadow-sm hover:bg-[#f9fafb] disabled:opacity-50"
          >
            <RefreshCw size={14} className={query.isFetching ? "animate-spin" : undefined} />
            Refresh
          </button>
        </div>

        {/* Main card */}
        <div className="overflow-hidden rounded-2xl border border-[#e8e8ec] bg-white shadow-sm">
          {/* Card header */}
          <div className="flex flex-col gap-3 border-b border-[#f3f4f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#111111]">Accounts</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6b7280]">
                <span>{data ? data.page.total.toLocaleString() : "0"} users</span>
                <span className="hidden h-1 w-1 rounded-full bg-[#d1d5db] sm:block"></span>
                <span>{activeFiltersCount} active filter{activeFiltersCount === 1 ? "" : "s"}</span>
                <span className="hidden h-1 w-1 rounded-full bg-[#d1d5db] sm:block"></span>
                <span>Actions audited</span>
              </div>
            </div>
            {isRefreshing && (
              <span className="flex items-center gap-1.5 text-xs text-[#9ca3af]" aria-live="polite">
                <Loader2 size={12} className="animate-spin" />
                Refreshing…
              </span>
            )}
          </div>

          {/* Toolbar */}
          <div className="border-b border-[#f3f4f6] px-5 py-3">
            <AdminUsersToolbar
              search={search}
              role={role}
              profileCompleted={profileCompleted}
              pageSize={limit}
              isFiltered={params.isFiltered}
              disabled={showSkeleton}
              onSearchChange={params.setSearch}
              onRoleChange={params.setRole}
              onProfileCompletedChange={params.setProfileCompleted}
              onPageSizeChange={params.setPageSize}
              onReset={params.resetFilters}
            />
          </div>

          {/* Content */}
          {showSkeleton && <AdminUsersSkeleton rows={limit > 25 ? 10 : limit} />}

          {!showSkeleton && !data && (
            <div className="p-5">
              <AdminUsersErrorState
                error={result?.error ?? null}
                unavailable={result?.unavailable}
                loading={query.isFetching}
                onRetry={() => void query.refetch()}
              />
            </div>
          )}

          {data && data.users.length === 0 && (
            <div className="p-5">
              <AdminUsersEmptyState filtered={params.isFiltered} onResetFilters={params.resetFilters} />
            </div>
          )}

          {data && data.users.length > 0 && (
            <>
              <AdminUsersTable users={data.users} />
              <div className="border-t border-[#f3f4f6] px-5 py-3">
                <AdminUsersPagination page={data.page} disabled={query.isFetching} onOffsetChange={params.setOffset} />
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

