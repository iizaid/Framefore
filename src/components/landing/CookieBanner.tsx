import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already accepted or dismissed the cookie policy
    const consent = localStorage.getItem("framefore_cookie_consent");
    if (!consent) {
      // Small delay so it doesn't appear instantly on hard refresh, feels smoother.
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("framefore_cookie_consent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("framefore_cookie_consent", "declined");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-6 right-6 z-[999] mx-auto max-w-sm sm:bottom-8 sm:left-auto sm:right-8 sm:mx-0 sm:max-w-md"
        >
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-strong)] bg-white p-6 shadow-2xl">
            {/* Close icon */}
            <button
              onClick={handleDecline}
              className="absolute right-4 top-4 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
              aria-label="Dismiss cookie banner"
            >
              <X size={16} />
            </button>

            <div className="flex gap-4 sm:items-start">
              {/* Cookie Logo Image */}
              <div className="shrink-0">
                <img
                  src="/cookies/cookies.svg"
                  alt="Cookie Policy"
                  className="h-12 w-12 object-contain"
                />
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-bold text-[var(--color-ink)]">We value your privacy</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                  We use cookies to improve your experience, analyze site traffic, and serve tailored
                  content. By continuing to use Framefore, you accept our use of cookies and privacy policy.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleAccept}
                    className="rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-105"
                  >
                    Accept
                  </button>
                  <button
                    onClick={handleDecline}
                    className="rounded-lg px-4 py-2 text-xs font-semibold text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
                  >
                    Manage / Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
