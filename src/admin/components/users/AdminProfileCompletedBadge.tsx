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
        "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
        completed
          ? "text-[#14532d]"
          : "text-[#77736d]",
      )}
    >
      <Icon size={12} />
      {completed ? "Completed" : "Incomplete"}
    </span>
  );
}
