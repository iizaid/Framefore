import { ClipboardCheck } from "lucide-react";

type AdminShellEmptyStateProps = {
  title: string;
  description: string;
  statusLabel?: string;
  bullets?: string[];
};

export function AdminShellEmptyState({ title, description, statusLabel, bullets = [] }: AdminShellEmptyStateProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-white p-5 shadow-[var(--ff-shadow-card)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-button)] bg-[var(--ff-blue-chalk)] text-[var(--ff-violet)]">
          <ClipboardCheck size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--ff-ink)]">{title}</h2>
            {statusLabel && (
              <span className="rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 font-mono-ui text-[10px] font-semibold uppercase text-[var(--color-ink-soft)]">
                {statusLabel}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">{description}</p>
          {bullets.length > 0 && (
            <ul className="mt-4 grid gap-2 text-sm text-[var(--ff-charcoal)] sm:grid-cols-2">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ff-violet)]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
