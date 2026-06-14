// The black right-panel shown on /login and /signup.
// Uses the pixel cat animation video from public/loading screen/.
export function AuthVideoPanel() {
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

      {/* Pixel cat animation */}
      <div className="relative flex flex-col items-center gap-6">
        <video
          src="/loading screen/loading screen.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{ imageRendering: "pixelated" }}
          className="h-48 w-48 sm:h-56 sm:w-56 lg:h-64 lg:w-64 object-contain"
          aria-label="Framefore pixel cat animation"
        >
          {/* Fallback if browser can't play */}
          <img src="/black.svg" alt="Framefore" className="h-20 w-20 invert" />
        </video>

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
