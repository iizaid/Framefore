import { ClipboardCheck } from "lucide-react";

type AdminShellEmptyStateProps = {
  title: string;
  description: string;
  statusLabel?: string;
  bullets?: string[];
};

export function AdminShellEmptyState({ title, description, statusLabel, bullets = [] }: AdminShellEmptyStateProps) {
  return (
    <section className="rounded-xl border border-dashed border-[#dedbd3] bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1f1ef] text-[#333333]">
          <ClipboardCheck size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-[#111111]">{title}</h2>
            {statusLabel && (
              <span className="rounded-full border border-[#dedbd3] bg-[#f7f7f5] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b6b66]">
                {statusLabel}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-[#6b6b66]">{description}</p>
          {bullets.length > 0 && (
            <ul className="mt-4 grid gap-2 text-sm text-[#333333] sm:grid-cols-2">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#111111]" />
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
