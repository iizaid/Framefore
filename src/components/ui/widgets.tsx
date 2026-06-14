import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import type { Direction } from "@/types";
import { getImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

/* Toggle text writing direction (LTR / RTL) for Arabic + English support. */
export function DirectionToggle({
  dir,
  onChange,
}: {
  dir: Direction;
  onChange: (d: Direction) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(dir === "ltr" ? "rtl" : "ltr")}
      title={`Direction: ${dir.toUpperCase()} — click to switch`}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-ink-faint)] transition-colors hover:bg-neutral-100 hover:text-[var(--color-ink-soft)]"
    >
      <Languages size={12} />
      {dir.toUpperCase()}
    </button>
  );
}

/* Resolves an IndexedDB image id to an object URL and cleans it up. */
export function ImageThumb({
  id,
  alt,
  className,
  onClick,
}: {
  id: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let made: string | null = null;
    getImageUrl(id).then((u) => {
      if (active && u) {
        made = u;
        setUrl(u);
      }
    });
    return () => {
      active = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [id]);

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-lg bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border-strong)]",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[var(--color-ink-faint)]">
          <div className="h-4 w-4 animate-pulse rounded-full bg-[var(--color-border-strong)]" />
        </div>
      )}
    </div>
  );
}

/* Circular progress ring for readiness scores. */
export function ReadinessRing({
  score,
  size = 44,
  stroke = 4,
}: {
  score: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score > 0 ? "#0a0a0a" : "#d4d4d4";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#ececec" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
        />
      </svg>
      <span className="absolute text-[11px] font-semibold tabular-nums">{score}</span>
    </div>
  );
}
