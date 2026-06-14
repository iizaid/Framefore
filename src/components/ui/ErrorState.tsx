import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  isDarkTheme?: boolean;
}

export function ErrorState({
  title = "Something went wrong.",
  message = "Check your connection and try again.",
  onRetry,
  className,
  isDarkTheme = false,
}: ErrorStateProps) {
  // Use the appropriate custom asset based on the theme
  const imageSrc = isDarkTheme ? "/error/error white.svg" : "/error/error black.svg";

  return (
    <div
      className={cn(
        "flex h-full min-h-[300px] w-full flex-col items-center justify-center p-6 text-center",
        className
      )}
    >
      <img
        src={imageSrc}
        alt="Error illustration"
        className="mb-6 h-32 w-32 object-contain opacity-90"
      />
      
      <h3 className={cn("font-display text-xl", isDarkTheme ? "text-white" : "text-[var(--color-ink)]")}>
        {title}
      </h3>
      
      <p className={cn("mt-2 max-w-md text-sm", isDarkTheme ? "text-white/70" : "text-[var(--color-ink-soft)]")}>
        {message}
      </p>

      {onRetry && (
        <Button
          variant={isDarkTheme ? "primary" : "subtle"}
          onClick={onRetry}
          className="mt-8 gap-2"
        >
          <RefreshCcw size={16} />
          Retry
        </Button>
      )}
    </div>
  );
}
