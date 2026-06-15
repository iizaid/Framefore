import { CircleCheck, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminProfileCompletedBadgeProps = {
  completed: boolean;
};

export function AdminProfileCompletedBadge({ completed }: AdminProfileCompletedBadgeProps) {
  const Icon = completed ? CircleCheck : CircleDashed;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
        completed
          ? "bg-[#f1f1ef] text-[#333333]"
          : "border border-[#dedbd3] text-[#6b6b66]",
      )}
    >
      <Icon size={12} />
      {completed ? "Completed" : "Incomplete"}
    </span>
  );
}
