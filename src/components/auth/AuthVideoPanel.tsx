import { useState } from "react";

// The black right-panel shown on /login and /signup.
// Plays the pixel animation from public/loading screen/ as a chrome-less,
// looping, muted clip — styled to read as a native animation, not a video
// player. If the asset is missing or fails to decode we fall back to the
// Framefore pixel mark so the panel never crashes or shows a broken player.
export function AuthVideoPanel() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
      {/* Subtle grid overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative flex flex-col items-center gap-6 px-8">
        {videoFailed ? (
          // Fallback: clean Framefore pixel mark
          <div className="grid h-48 w-48 place-items-center sm:h-56 sm:w-56">
            <img
              src="/white.svg"
              alt="Framefore"
              className="h-24 w-24"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        ) : (
          <video
            src="/loading screen/loading screen.mp4"
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            disablePictureInPicture
            onError={() => setVideoFailed(true)}
            style={{ imageRendering: "pixelated" }}
            className="h-48 w-48 object-contain sm:h-56 sm:w-56 lg:h-64 lg:w-64"
            aria-label="Framefore pixel animation"
          />
        )}

        <div className="text-center">
          <p className="font-display text-lg font-medium text-white/90 sm:text-xl">
            Plan before you generate.
          </p>
          <p className="mt-1 text-sm text-white/40">
            Scenes, prompts, references — all in one place.
          </p>
        </div>
      </div>
    </div>
  );
}
