export function AdminOverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--ff-shadow-card)]">
            <div className="mb-4 h-10 w-10 rounded-[var(--radius-button)] bg-[var(--color-surface-2)]" />
            <div className="h-3 w-24 rounded bg-[var(--color-surface-2)]" />
            <div className="mt-2 h-8 w-20 rounded bg-[var(--color-surface-2)]" />
            <div className="mt-2 h-3 w-32 rounded bg-[var(--color-surface-2)]" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--ff-shadow-card)]">
            <div className="mb-4 h-5 w-32 rounded bg-[var(--color-surface-2)]" />
            <div className="space-y-2">
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex justify-between py-2">
                  <div className="h-3 w-24 rounded bg-[var(--color-surface-2)]" />
                  <div className="h-3 w-10 rounded bg-[var(--color-surface-2)]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--ff-shadow-card)]">
            <div className="mb-3 h-4 w-28 rounded bg-[var(--color-surface-2)]" />
            <div className="h-14 w-full rounded-[var(--radius-button)] bg-[var(--color-surface-2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
