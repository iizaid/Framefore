type AdminUsersSkeletonProps = {
  rows?: number;
};

export function AdminUsersSkeleton({ rows = 8 }: AdminUsersSkeletonProps) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-[#e6e4de] bg-white"
      aria-label="Loading users"
    >
      <div className="border-b border-[#e6e4de] px-4 py-3">
        <div className="h-3 w-28 animate-pulse rounded bg-[#e9e7e1]" />
      </div>
      <div className="divide-y divide-[#eeece7]">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3.5">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[#e9e7e1]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-40 max-w-full animate-pulse rounded bg-[#e9e7e1]" />
              <div className="h-3 w-56 max-w-full animate-pulse rounded bg-[#e9e7e1]" />
            </div>
            <div className="hidden h-5 w-20 animate-pulse rounded-full bg-[#e9e7e1] sm:block" />
            <div className="hidden h-5 w-24 animate-pulse rounded-full bg-[#e9e7e1] lg:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
