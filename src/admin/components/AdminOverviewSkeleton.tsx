export function AdminOverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-[#e8e8ec] bg-white p-5 shadow-sm">
            <div className="mb-4 h-10 w-10 rounded-xl bg-[#f3f4f6]" />
            <div className="h-3 w-24 rounded bg-[#f3f4f6]" />
            <div className="mt-2 h-8 w-20 rounded bg-[#f3f4f6]" />
            <div className="mt-2 h-3 w-32 rounded bg-[#f3f4f6]" />
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-[#e8e8ec] bg-white p-5 shadow-sm">
            <div className="mb-4 h-5 w-32 rounded bg-[#f3f4f6]" />
            <div className="space-y-2">
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex justify-between py-2">
                  <div className="h-3 w-24 rounded bg-[#f3f4f6]" />
                  <div className="h-3 w-10 rounded bg-[#f3f4f6]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bar charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-[#e8e8ec] bg-white p-5 shadow-sm">
            <div className="mb-3 h-4 w-28 rounded bg-[#f3f4f6]" />
            <div className="h-14 w-full rounded-lg bg-[#f3f4f6]" />
          </div>
        ))}
      </div>
    </div>
  );
}
