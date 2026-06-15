import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const LOADING_VIDEO_SRC = "/loading%20screen/loading%20screen.mp4";
// Safety net only: if shell-asset warming ever stalls (e.g. fonts.ready never
// settles) we still let the app through. There is intentionally NO minimum
// visible time and NO wait for the intro video to finish — the splash leaves the
// instant the app is actually ready, so fast loads feel instant.
const MAX_VISIBLE_MS = 1200;

export function AppLoadingScreen({ ready }: { ready: boolean }) {
  const [assetsPrepared, setAssetsPrepared] = useState(false);
  const [maxElapsed, setMaxElapsed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const maxTimer = window.setTimeout(() => setMaxElapsed(true), MAX_VISIBLE_MS);
    return () => window.clearTimeout(maxTimer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const warmImage = (src: string) =>
      new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = src;
      });

    const prepareShellAssets = async () => {
      await Promise.all([
        "fonts" in document ? document.fonts.ready.catch(() => undefined) : Promise.resolve(),
        warmImage("/black.svg"),
        warmImage("/white.svg"),
      ]);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!cancelled) setAssetsPrepared(true);
    };

    void prepareShellAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = 2.2;
    void video.play().catch(() => undefined);
  }, []);

  // Leave as soon as the app is ready and shell assets are warm. The intro video
  // plays only for as long as that takes — it never holds the app back.
  const shouldExit = ready && (assetsPrepared || maxElapsed);

  return (
    <AnimatePresence>
      {!shouldExit && (
        <motion.div
          className="fixed inset-0 z-[999] overflow-hidden bg-[#fbfaf9]"
          initial={{ y: 0 }}
          exit={{ y: "-105%", transition: { duration: 0.62, ease: [0.82, 0, 0.16, 1] } }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.92),rgba(248,247,244,0.98)_48%,rgba(242,240,237,1))]" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />

          <div className="relative z-10 grid h-full place-items-center px-6">
            <motion.div
              className="relative grid h-56 w-56 place-items-center sm:h-72 sm:w-72"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="absolute inset-0 rounded-full bg-white/45 blur-3xl" />
              <video
                ref={videoRef}
                src={LOADING_VIDEO_SRC}
                muted
                playsInline
                preload="auto"
                disablePictureInPicture
                controls={false}
                onError={() => setMaxElapsed(true)}
                onContextMenu={(e) => e.preventDefault()}
                className="pointer-events-none relative h-full w-full select-none object-contain mix-blend-multiply"
                aria-hidden="true"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
