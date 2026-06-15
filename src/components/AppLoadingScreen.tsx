import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const LOADING_VIDEO_SRC = "/loading%20screen/loading%20screen.mp4";

// After this many ms we exit regardless, so nothing ever blocks the app.
const MAX_VISIBLE_MS = 1200;

// If assets + ready signal arrive within this window, we still show a
// comfortable moment so the animation has time to play.
const MIN_FEEL_MS = 900;

// Session-storage key. Once the boot screen has played once per tab session,
// we never force it again — refreshes and navigations go straight to content.
const BOOT_SEEN_KEY = "framefore_boot_seen";

function wasBootSeen(): boolean {
  try {
    return sessionStorage.getItem(BOOT_SEEN_KEY) === "1";
  } catch {
    return false; // private/unavailable storage — skip gracefully
  }
}

function markBootSeen(): void {
  try {
    sessionStorage.setItem(BOOT_SEEN_KEY, "1");
  } catch {
    // noop
  }
}

export function AppLoadingScreen({ ready }: { ready: boolean }) {
  // Decide at mount-time whether to show at all. If this session already ran
  // the boot screen, skip immediately — navigating back to "/" should never
  // re-trigger the splash.
  const [active] = useState<boolean>(() => !wasBootSeen());

  const [assetsPrepared, setAssetsPrepared] = useState(false);
  const [maxElapsed, setMaxElapsed] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // If we're not active, render nothing at all — no state, no timers.
  // We still call all hooks unconditionally to satisfy Rules of Hooks.
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => setMaxElapsed(true), MAX_VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => setMinElapsed(true), MIN_FEEL_MS);
    return () => window.clearTimeout(t);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const warmImage = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });

    const prepare = async () => {
      await Promise.all([
        "fonts" in document ? document.fonts.ready.catch(() => undefined) : Promise.resolve(),
        warmImage("/black.svg"),
        warmImage("/white.svg"),
      ]);
      // Two rAF ticks so the browser has had a paint cycle before we claim ready.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      if (!cancelled) setAssetsPrepared(true);
    };

    void prepare();
    return () => { cancelled = true; };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = 2.2;
    void video.play().catch(() => undefined);
  }, [active]);

  // Exit when the app is ready AND shell assets are warm AND the tiny feel
  // delay has passed, OR when the safety timer fires.
  const shouldExit =
    !active ||
    (ready && (assetsPrepared || maxElapsed) && minElapsed) ||
    maxElapsed;

  // Mark seen the moment we decide to exit so subsequent renders never show it.
  useEffect(() => {
    if (shouldExit && active) markBootSeen();
  }, [shouldExit, active]);

  return (
    <AnimatePresence>
      {!shouldExit && (
        <motion.div
          className="fixed inset-0 z-[999] overflow-hidden bg-[#fbfaf9]"
          initial={{ y: 0 }}
          exit={{ y: "-105%", transition: { duration: 0.55, ease: [0.82, 0, 0.16, 1] } }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.92),rgba(248,247,244,0.98)_48%,rgba(242,240,237,1))]" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />

          <div className="relative z-10 grid h-full place-items-center px-6">
            <motion.div
              className="relative grid h-56 w-56 place-items-center sm:h-72 sm:w-72"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
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
