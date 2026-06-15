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

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value: string | null, withTime = false): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return (withTime ? dateTimeFormatter : dateFormatter).format(d);
}

const ch = createColumnHelper<AdminUsersListItem>();

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  const columns = useMemo(
    () => [
      ch.display({
        id: "user",
        header: "User",
        cell: ({ row }) => <AdminUserIdentityCell user={row.original} />,
      }),
      ch.accessor("roles", {
        id: "roles",
        header: "Roles",
        cell: ({ getValue }) => <AdminUserRoleBadges roles={getValue()} />,
      }),
      ch.display({
        id: "profile",
        header: "Profile",
        cell: ({ row }) => <AdminProfileCompletedBadge completed={row.original.profileCompleted} />,
      }),
      ch.accessor("createdAt", {
        id: "createdAt",
        header: "Created",
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-[13px] text-[#9ca3af]">{formatDate(getValue())}</span>
        ),
      }),
      ch.accessor("lastSignInAt", {
        id: "lastSignInAt",
        header: "Last sign-in",
        cell: ({ getValue }) => {
          const v = getValue();
          return (
            <span className="whitespace-nowrap text-[13px] text-[#9ca3af]">
              {v ? formatDate(v, true) : <span className="text-[#d1d5db]">Never</span>}
            </span>
          );
        },
      }),
      ch.display({
        id: "access",
        header: "Access",
        cell: ({ row }) => {
          const has = row.original.isOwner || row.original.isAdmin;
          return has ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck size={11} />
              Console
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-400">
              <ShieldOff size={11} />
              No access
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
    manualPagination: true,
    manualSorting: true,
    enableSorting: false,
    getRowId: (row) => row.userId,
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-[#f3f4f6] bg-[#fafafa]">
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  scope="col"
                  className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9ca3af]"
                >
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              className={`border-b border-[#f9fafb] transition-colors hover:bg-[#f9fafb] ${i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-5 py-3.5 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
