import type { ReactNode } from "react";

type AdminMetricGridProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function AdminMetricGrid({ title, description, children }: AdminMetricGridProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-[var(--ff-ink)]">{title}</h2>
        {description && <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{description}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}
