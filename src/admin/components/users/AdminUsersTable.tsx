import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { AdminProfileCompletedBadge } from "@/admin/components/users/AdminProfileCompletedBadge";
import { AdminUserIdentityCell } from "@/admin/components/users/AdminUserIdentityCell";
import { AdminUserRoleBadges } from "@/admin/components/users/AdminUserRoleBadges";
import type { AdminUsersListItem } from "@/admin/types";

type AdminUsersTableProps = {
  users: AdminUsersListItem[];
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function formatDate(value: string | null, withTime = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return (withTime ? dateTimeFormatter : dateFormatter).format(date);
}

const columnHelper = createColumnHelper<AdminUsersListItem>();

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "user",
        header: "User",
        cell: ({ row }) => <AdminUserIdentityCell user={row.original} />,
      }),
      columnHelper.accessor("roles", {
        id: "roles",
        header: "Roles",
        cell: ({ getValue }) => <AdminUserRoleBadges roles={getValue()} />,
      }),
      columnHelper.display({
        id: "profile",
        header: "Profile",
        cell: ({ row }) => <AdminProfileCompletedBadge completed={row.original.profileCompleted} />,
      }),
      columnHelper.accessor("createdAt", {
        id: "createdAt",
        header: "Created",
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-sm text-[var(--color-ink-soft)]">{formatDate(getValue())}</span>
        ),
      }),
      columnHelper.accessor("lastSignInAt", {
        id: "lastSignInAt",
        header: "Last sign-in",
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <span className="whitespace-nowrap text-sm text-[var(--color-ink-soft)]">
              {value ? formatDate(value, true) : "Never"}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "access",
        header: "Console access",
        cell: ({ row }) => {
          const hasConsole = row.original.isOwner || row.original.isAdmin;
          return hasConsole ? (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-[var(--color-ink)]">
              <ShieldCheck size={13} />
              Admin console
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-[var(--color-ink-soft)]"
              title="Support and reviewer roles do not grant Admin Console access in the MVP."
            >
              <ShieldOff size={13} />
              No access (MVP)
            </span>
          );
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Server-side pagination: the RPC already returns one page. TanStack Table
    // is purely the headless column/render model here — it must not pretend to
    // sort or paginate data the server controls. Sorting stays disabled until a
    // server-backed sort exists.
    manualPagination: true,
    manualSorting: true,
    enableSorting: false,
    getRowId: (row) => row.userId,
  });

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="border-b border-[var(--color-border-strong)] bg-[var(--color-surface)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--color-border-strong)]">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--color-stone-surface)]/50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3.5 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
