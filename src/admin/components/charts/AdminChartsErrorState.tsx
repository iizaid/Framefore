import { AlertCircle } from "lucide-react";

export function AdminChartsErrorState({ error, unavailable }: { error: string; unavailable?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e8e8ec] bg-[#fafafa] py-16 text-center shadow-sm">
      <AlertCircle className="mb-4 h-8 w-8 text-[#9ca3af]" />
      <h3 className="text-sm font-semibold text-[#111111]">
        {unavailable ? "Charts Unavailable" : "Failed to load charts"}
      </h3>
      <p className="mt-1 max-w-[400px] text-sm text-[#6b7280]">
        {error}
      </p>
      {unavailable && (
        <p className="mt-4 text-xs font-medium text-[#6366f1]">
          Please run migration 0012 to enable the charting API.
        </p>
      )}
    </div>
  );
}
