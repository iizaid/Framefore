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
  return [search, role, profileCompleted].filter((value) => value !== null && value !== "").length;
}

export function AdminUsersPage() {
  const params = useAdminUsersQueryParams();
  const { search, role, profileCompleted, limit, offset } = params;

  // Server state only — owned by TanStack Query, never Zustand. The query key is
  // derived from the URL-normalized filters so equivalent views share a cache
  // entry and refreshes/back-forward reproduce the same request.
  const query = useQuery({
    queryKey: adminQueryKeys.users.list({ search, role, profileCompleted, limit, offset }),
    queryFn: () => loadAdminUsers({ search, role, profileCompleted, limit, offset }),
    // Keep the previous page visible during a background refetch to avoid a
    // jarring skeleton flash when paging or tweaking filters.
    placeholderData: (previous) => previous,
  });

  const result = query.data;
  const showSkeleton = query.isLoading && !result;
  const isRefreshing = query.isFetching && !query.isLoading;
  const data = result?.data ?? null;
  const activeFiltersCount = countActiveFilters(search, role, profileCompleted);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight text-[#111111]">Users</h2>
            <p className="mt-1 text-sm leading-6 text-[#6b6b66]">
              Review account access, profile status, and admin roles from the
              admin-only users RPC.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            className="inline-flex w-fit items-center justify-center gap-1.5 rounded-lg bg-[#111111] px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={15} className={query.isFetching ? "animate-spin" : undefined} />
            Refresh
          </button>
        </section>

        <section className="grid overflow-hidden rounded-2xl border border-[#deded8] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:grid-cols-3">
          <div className="border-b border-[#e4e3dd] px-4 py-3 md:border-b-0 md:border-r">
            <p className="text-xs font-medium text-[#6b6b66]">Rows on this page</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[#111111]">
              {data ? data.page.returned : showSkeleton ? "..." : 0}
            </p>
          </div>
          <div className="border-b border-[#e4e3dd] px-4 py-3 md:border-b-0 md:border-r">
            <p className="text-xs font-medium text-[#6b6b66]">Filtered total</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[#111111]">
              {data ? data.page.total : showSkeleton ? "..." : 0}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-[#6b6b66]">Active filters</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[#111111]">{activeFiltersCount}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#deded8] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="border-b border-[#e4e3dd] px-3 py-2.5 sm:px-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[#111111]">Accounts</h3>
                <p className="mt-0.5 text-xs text-[#6b6b66]">
                  Read-only list. No user actions, selections, or bulk controls exist yet.
                </p>
              </div>
              {isRefreshing && (
                <p className="flex items-center gap-1.5 text-xs text-[#6b6b66]" aria-live="polite">
                  <Loader2 size={13} className="animate-spin" />
                  Refreshing
                </p>
              )}
            </div>
          </div>

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

          {showSkeleton && <AdminUsersSkeleton rows={limit > 25 ? 10 : limit} />}

          {!showSkeleton && !data && (
            <div className="p-3 sm:p-4">
              <AdminUsersErrorState
                error={result?.error ?? null}
                unavailable={result?.unavailable}
                loading={query.isFetching}
                onRetry={() => void query.refetch()}
              />
            </div>
          )}

          {data && data.users.length === 0 && (
            <div className="p-3 sm:p-4">
              <AdminUsersEmptyState filtered={params.isFiltered} onResetFilters={params.resetFilters} />
            </div>
          )}

          {data && data.users.length > 0 && (
            <>
              <AdminUsersTable users={data.users} />
              <AdminUsersPagination page={data.page} disabled={query.isFetching} onOffsetChange={params.setOffset} />
            </>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
