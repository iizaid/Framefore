import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./primitives";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-start sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={cn(
              "relative z-10 w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-4 shadow-2xl sm:my-auto sm:max-h-[calc(100dvh-4rem)] sm:rounded-2xl sm:p-6",
              className,
            )}
          >
            {(title || description) && (
              <div className="mb-5 pr-8">
                {title && <h2 className="text-lg font-semibold text-balance">{title}</h2>}
                {description && (
                  <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{description}</p>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute right-3 top-3"
              aria-label="Close"
            >
              <X size={18} />
            </Button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={message} className="max-w-sm">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
