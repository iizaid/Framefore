import { useEffect, useReducer } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/primitives";
import { useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceCta } from "@/components/auth/useWorkspaceCta";
import { AccountMenu } from "@/components/account/AccountMenu";
import { useAdminRoleStore } from "@/admin/store/useAdminRoleStore";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Canvas", href: "#canvas" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

// ── Reusable brand mark ───────────────────────────────────────────────────────
// variant="light" → white logo+text (for dark backgrounds)
// variant="dark"  → black logo+text (for light backgrounds)
function LandingBrandMark({
  variant,
  onClick,
}: {
  variant: "light" | "dark";
  onClick?: () => void;
}) {
  return (
    <Link 
      to="/" 
      onClick={(e) => {
        if (window.location.pathname === "/") {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        if (onClick) onClick();
      }} 
      className="flex items-center gap-2.5 shrink-0 cursor-pointer"
    >
      <img
        src={variant === "dark" ? "/black.svg" : "/white.svg"}
        alt="Framefore"
        className="h-7 w-7 transition-all duration-300"
      />
      <span
        className={cn(
          "font-display text-xl transition-colors duration-300",
          variant === "dark" ? "text-[var(--color-charcoal)]" : "text-white"
        )}
      >
        Framefore
      </span>
    </Link>
  );
}

// ── Animation variants ────────────────────────────────────────────────────────
const drawerVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.98,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

const linkVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.18, ease: "easeOut" },
  }),
};

// ── Main component ────────────────────────────────────────────────────────────
export function LandingNav() {
  const [open, toggle] = useReducer((s: boolean) => !s, false);
  const close = () => { if (open) toggle(); };

  // Signed-in state drives the auth controls: signed-out shows "Log in"; signed
  // in hides it and shows the avatar/account menu.
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const rolesInitialized = useAdminRoleStore((s) => s.initialized);
  const canAccessAdmin = useAdminRoleStore((s) => s.canAccessAdmin);
  const showMobileAdminLink = Boolean(user && rolesInitialized && canAccessAdmin);
  // Auth-aware workspace CTA target (signed-out → /signup, never /app).
  const cta = useWorkspaceCta();

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Escape key closes drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Hero is now a light, text-first surface, so the nav stays in its light
  // product-cockpit mode from the first paint.
  const isLight = true;

  // Nav link style depends on navbar mode
  const linkClass = cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
    isLight
      ? "text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
      : "text-white/80 hover:bg-white/10 hover:text-white"
  );

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          isLight
            ? "border-b border-[var(--color-border)] bg-white/88 shadow-[0_4px_20px_-14px_rgba(18,43,165,0.18)] backdrop-blur-xl"
            : "border-b border-white/10 bg-black/20 backdrop-blur-md"
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          {/* Brand — switches between white/dark based on isLight */}
          <LandingBrandMark variant={isLight ? "dark" : "light"} onClick={close} />

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className={linkClass}>
                {l.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2.5 md:flex">
            {user ? (
              <>
                <Link to={cta.to}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="transition-all duration-300"
                  >
                    {cta.label}
                  </Button>
                </Link>
                <AccountMenu variant={isLight ? "light" : "dark"} />
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300",
                    isLight
                      ? "text-[var(--color-ink)] hover:bg-black/5 hover:text-black"
                      : "text-white/90 hover:bg-white/10 hover:text-white"
                  )}
                >
                  Log in
                </Link>
                <Link to={cta.to}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="transition-all duration-300"
                  >
                    {cta.label}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile — hamburger only (no duplicate CTA in top bar) */}
          <div className="flex items-center md:hidden">
            <button
              onClick={toggle}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full transition-colors",
                isLight
                  ? "text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)]"
                  : "text-white hover:bg-white/10"
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {open ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -45, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 45, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X size={20} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 45, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -45, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu size={20} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer (outside <header> — avoids stacking context issues) ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop dim — clicking it closes the drawer */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 top-16 z-30 bg-black/25 md:hidden"
              aria-hidden
              onClick={close}
            />

            {/* Floating drawer card */}
            <motion.div
              key="drawer"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-x-3 top-[4.25rem] z-40 overflow-hidden rounded-2xl border border-[var(--color-border-strong)] bg-white shadow-2xl md:hidden"
            >
              <nav className="flex flex-col px-3 py-3">
                {NAV_LINKS.map((l, i) => (
                  <motion.a
                    key={l.href}
                    href={l.href}
                    custom={i}
                    variants={linkVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={close}
                    className="flex h-11 items-center rounded-xl px-4 text-[15px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-2)]"
                  >
                    {l.label}
                  </motion.a>
                ))}

                <motion.div
                  custom={NAV_LINKS.length}
                  variants={linkVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {user ? (
                    <Link
                      to="/profile"
                      onClick={close}
                      className="flex h-11 items-center rounded-xl px-4 text-[15px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-2)]"
                    >
                      Profile
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      onClick={close}
                      className="flex h-11 items-center rounded-xl px-4 text-[15px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-2)]"
                    >
                      Login
                    </Link>
                  )}
                </motion.div>

                {user && (
                  <motion.div
                    custom={NAV_LINKS.length + 0.5}
                    variants={linkVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {showMobileAdminLink && (
                      <Link
                        to="/admin"
                        onClick={close}
                        className="flex h-11 items-center rounded-xl px-4 text-[15px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-2)]"
                      >
                        Admin console
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        void signOut();
                      }}
                      className="flex h-11 w-full items-center rounded-xl px-4 text-left text-[15px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-2)]"
                    >
                      Sign out
                    </button>
                  </motion.div>
                )}

                <div className="my-2 h-px bg-[var(--color-border-strong)]" />

                <motion.div
                  custom={NAV_LINKS.length + 1}
                  variants={linkVariants}
                  initial="hidden"
                  animate="visible"
                  className="px-1 pb-1"
                >
                  <Link to={cta.to} onClick={close}>
                    <Button variant="primary" size="md" className="w-full">
                      {cta.label}
                    </Button>
                  </Link>
                </motion.div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
