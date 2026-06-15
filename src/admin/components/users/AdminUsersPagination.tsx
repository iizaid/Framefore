import { ChevronLeft, ChevronRight, ChevronsLeft } from "lucide-react";
import { MAX_USERS_OFFSET } from "@/admin/lib/users";
import type { AdminUsersListPage } from "@/admin/types";

type AdminUsersPaginationProps = {
  page: AdminUsersListPage;
  disabled?: boolean;
  onOffsetChange: (offset: number) => void;
};

const BUTTON_CLASS =
  "inline-flex items-center justify-center gap-1 rounded-lg border border-[#dedbd3] bg-white px-3 py-2 text-sm font-medium text-[#333333] hover:bg-[#f7f7f5] disabled:cursor-not-allowed disabled:opacity-50";

export function AdminUsersPagination({ page, disabled = false, onOffsetChange }: AdminUsersPaginationProps) {
  const { limit, offset, returned, total, hasMore } = page;

  const start = total === 0 ? 0 : offset + 1;
  const end = offset + returned;

  const canGoPrevious = offset > 0;
  // Respect the server/client offset cap so we never request an offset the RPC
  // would reject.
  const nextOffset = offset + limit;
  const canGoNext = hasMore && nextOffset <= MAX_USERS_OFFSET;

  return (
    <div className="flex flex-col gap-3 border-t border-[#e4e3dd] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[#6b6b66]" aria-live="polite">
        {total === 0 ? "No users to show" : `Showing ${start}–${end} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={BUTTON_CLASS}
          disabled={disabled || !canGoPrevious}
          onClick={() => onOffsetChange(0)}
          aria-label="First page"
        >
          <ChevronsLeft size={15} />
          First
        </button>
        <button
          type="button"
          className={BUTTON_CLASS}
          disabled={disabled || !canGoPrevious}
          onClick={() => onOffsetChange(Math.max(offset - limit, 0))}
        >
          <ChevronLeft size={15} />
          Previous
        </button>
        <button
          type="button"
          className={BUTTON_CLASS}
          disabled={disabled || !canGoNext}
          onClick={() => onOffsetChange(nextOffset)}
        >
          Next
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
