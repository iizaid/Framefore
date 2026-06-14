import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const DURATION_MS = 2600;

// Landing-only intro screen. Shows the brand for ~2.6s then wipes upward to
// reveal the page. Gated by sessionStorage so it plays once per browser session
// (not on every internal navigation back to "/"). Reduced-motion users skip it
// entirely — no point holding them on a screen they can't perceive moving.
export function LandingLoader() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!show) return;
    if (reduce) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => {
      setShow(false);
    }, DURATION_MS);
    return () => clearTimeout(t);
  }, [show, reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-neutral-950"
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <img src="/white.svg" alt="Framefore" className="h-12 w-12" />
            <span className="font-hero mt-4 text-2xl text-white">Framefore</span>
            <span className="mt-2 text-sm text-white/50">Preparing your story board</span>

            {/* slim indeterminate progress sweep */}
            <div className="mt-6 h-[3px] w-40 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full w-1/3 rounded-full bg-white"
                initial={{ x: "-120%" }}
                animate={{ x: "360%" }}
                transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
