import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, PlayCircle } from "lucide-react";

interface VideoLightboxProps {
  open: boolean;
  onClose: () => void;
  src?: string;
}

export function VideoLightbox({ open, onClose, src = "/demo/framefore-demo.mp4" }: VideoLightboxProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setHasError(false);
    } else {
      document.body.style.overflow = "";
      videoRef.current?.pause();
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ backgroundColor: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-4xl"
            initial={{ scale: 0.93, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="Close video"
              className="absolute -top-10 right-0 flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
            >
              <X size={18} /> Close
            </button>

            <div className="overflow-hidden rounded-2xl bg-neutral-950 shadow-2xl">
              <div className="aspect-video">
                {hasError ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-white/50">
                    <PlayCircle size={52} className="opacity-30" />
                    <p className="text-sm">Demo video coming soon</p>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    src={src}
                    controls
                    playsInline
                    className="h-full w-full"
                    onError={() => setHasError(true)}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
