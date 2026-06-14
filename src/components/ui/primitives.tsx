import { forwardRef, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/* ─── Button ─────────────────────────────────────────────────────────────── */
type ButtonVariant = "primary" | "ghost" | "outline" | "danger" | "subtle" | "link";
type ButtonSize = "sm" | "md" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  // Midnight pill — the one dark punch against the cream canvas.
  primary: "bg-[#121212] text-white hover:bg-[#343433]",
  ghost: "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-stone-surface)]",
  outline:
    "bg-transparent text-[var(--color-ink)] shadow-[var(--color-border-strong)_0_0_0_1px_inset] hover:bg-[var(--color-stone-surface)]",
  danger: "bg-[#ff2b3a] text-white hover:brightness-95",
  // Warm stone secondary pill — paired hierarchy with the dark pill.
  subtle: "bg-[var(--color-stone-surface)] text-[var(--color-ink)] hover:bg-[#ece9e4]",
  // Ember text-link — the rare orange accent, never a fill.
  link: "bg-transparent text-[var(--color-ember)] hover:opacity-80 !px-0 !rounded-none",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-xs gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  icon: "h-9 w-9",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }
>(({ className, variant = "subtle", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212]/15 cursor-pointer",
      buttonVariants[variant],
      buttonSizes[size],
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";

/* ─── Input / Textarea ───────────────────────────────────────────────────── */
const fieldBase =
  "w-full rounded-[10px] bg-white border border-[var(--color-border-strong)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] transition-colors focus:outline-none focus:border-[var(--color-ash)] focus:ring-2 focus:ring-[#121212]/10";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, "h-10", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldBase, "min-h-[80px] resize-y leading-relaxed", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/* Auto-growing textarea — grows to fit its content so long prompts/narration
   don't get trapped in a tiny scroll box. `minRows` sets the resting height. */
export const AutoTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }
>(({ className, minRows = 3, value, onChange, ...props }, ref) => {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const resize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Recompute on every value change (incl. external resets like auto-distribute).
  useLayoutEffect(() => {
    resize(innerRef.current);
  }, [value]);

  return (
    <textarea
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }}
      rows={minRows}
      value={value}
      onChange={(e) => {
        resize(e.currentTarget);
        onChange?.(e);
      }}
      className={cn(fieldBase, "resize-none overflow-hidden leading-relaxed", className)}
      {...props}
    />
  );
});
AutoTextarea.displayName = "AutoTextarea";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(fieldBase, "h-10 cursor-pointer appearance-none pr-8", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236B6B82' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

/* ─── Field wrapper ──────────────────────────────────────────────────────── */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="flex items-center justify-between text-xs font-medium text-[var(--color-ink-soft)]">
          {label}
          {hint && <span className="text-[var(--color-ink-faint)] font-normal">{hint}</span>}
        </span>
      )}
      {children}
    </label>
  );
}

/* ─── Badge ──────────────────────────────────────────────────────────────── */
export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ─── Card ───────────────────────────────────────────────────────────────── */
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "card-surface rounded-[var(--radius-card)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
