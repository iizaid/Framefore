import { Users, FilterX } from "lucide-react";

type AdminUsersEmptyStateProps = {
  filtered: boolean;
  onResetFilters?: () => void;
};

export function AdminUsersEmptyState({ filtered, onResetFilters }: AdminUsersEmptyStateProps) {
  const Icon = filtered ? FilterX : Users;
  const title = filtered ? "No users match these filters." : "No users found yet.";
  const description = filtered
    ? "Try adjusting or clearing the search and filters above."
    : "Users will appear here once accounts exist in the database.";

  return (
    <section className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8">
      <div className="mx-auto flex max-w-sm flex-col items-center text-center">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-stone-surface)] text-[var(--color-ink)]">
          <Icon size={18} />
        </span>
        <h2 className="mt-3 font-display text-lg text-[var(--color-charcoal)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">{description}</p>
        {filtered && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-stone-surface)]"
          >
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
}
