import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, AlertTriangle } from "lucide-react";
import { nanoid } from "nanoid";

type ToastKind = "success" | "info" | "error";
interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, kind?: ToastKind) => void;
  remove: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (message, kind = "success") => {
    const id = nanoid();
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2400);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, kind?: ToastKind) => useToast.getState().push(message, kind);

const icons = {
  success: <Check size={16} className="text-emerald-600" />,
  info: <Info size={16} className="text-neutral-500" />,
  error: <AlertTriangle size={16} className="text-rose-600" />,
};

export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-elevated)] px-4 py-2 text-sm shadow-xl glass"
          >
            {icons[t.kind]}
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
