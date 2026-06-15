const SKELETON_GROUPS = ["Platform", "Profiles", "Roles", "Events", "Cloud rows", "Storage"];

export function AdminOverviewSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading overview metrics">
      {SKELETON_GROUPS.map((group) => (
        <section key={group} className="space-y-3">
          <div>
            <div className="h-5 w-32 animate-pulse rounded bg-[#e9e7e1]" />
            <div className="mt-2 h-3 w-64 max-w-full animate-pulse rounded bg-[#e9e7e1]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: group === "Events" ? 6 : 3 }).map((_, index) => (
              <div
                key={`${group}-${index}`}
                className="rounded-xl border border-[#e6e4de] bg-white p-4"
              >
                <div className="h-3 w-24 animate-pulse rounded bg-[#e9e7e1]" />
                <div className="mt-4 h-8 w-20 animate-pulse rounded bg-[#e9e7e1]" />
                <div className="mt-3 h-3 w-full animate-pulse rounded bg-[#e9e7e1]" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
