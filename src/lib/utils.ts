import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(totalSec: number): string {
  if (!totalSec || totalSec < 0) return "0s";
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(ts);
}

export function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

// Detect whether a string is predominantly RTL (Arabic/Hebrew) for auto-direction.
export function detectDirection(text: string): "rtl" | "ltr" {
  const rtlChars = (text.match(/[֐-׿؀-ۿݐ-ݿࢠ-ࣿ]/g) || []).length;
  const ltrChars = (text.match(/[A-Za-z]/g) || []).length;
  return rtlChars > ltrChars ? "rtl" : "ltr";
}

export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^\w؀-ۿ\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "framefore-project"
  );
}
