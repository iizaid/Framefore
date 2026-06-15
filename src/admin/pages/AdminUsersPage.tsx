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

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-2xl border border-[#e6e4de] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b6b66]">
                Owner/admin only
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111111]">Users</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b6b66]">
                A read-only list from the admin-only users RPC. No raw auth
                metadata, phone, location, avatar paths, or creative content is
                shown, and no user actions exist yet.
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
          </div>
        </section>

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

        {isRefreshing && (
          <p className="flex items-center gap-1.5 text-xs text-[#6b6b66]" aria-live="polite">
            <Loader2 size={13} className="animate-spin" />
            Refreshing…
          </p>
        )}

        {showSkeleton && <AdminUsersSkeleton rows={limit > 25 ? 10 : limit} />}

        {!showSkeleton && !data && (
          <AdminUsersErrorState
            error={result?.error ?? null}
            unavailable={result?.unavailable}
            loading={query.isFetching}
            onRetry={() => void query.refetch()}
          />
        )}

        {data && data.users.length === 0 && (
          <AdminUsersEmptyState filtered={params.isFiltered} onResetFilters={params.resetFilters} />
        )}

        {data && data.users.length > 0 && (
          <div className="space-y-4">
            <AdminUsersTable users={data.users} />
            <AdminUsersPagination page={data.page} disabled={query.isFetching} onOffsetChange={params.setOffset} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
