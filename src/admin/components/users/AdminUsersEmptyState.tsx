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
    <section className="border-y border-[var(--color-border)] bg-white p-8">
      <div className="mx-auto flex max-w-sm flex-col items-center text-center">
        <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-button)] bg-[var(--ff-blue-chalk)] text-[var(--ff-violet)]">
          <Icon size={18} />
        </span>
        <h2 className="mt-3 text-base font-semibold text-[var(--ff-ink)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">{description}</p>
        {filtered && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--ff-charcoal)] hover:bg-[var(--color-surface-2)]"
          >
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
}
