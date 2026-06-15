import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, LayoutGrid, LogOut, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";
import { cn } from "@/lib/utils";

// Shared signed-in account control: an avatar button that opens a small menu
// with Profile / Open app / Sign out. Used by the landing navbar and (optionally)
// elsewhere. Renders nothing when there is no signed-in user — callers decide
// what to show for signed-out visitors.
export function AccountMenu({ variant = "light" }: { variant?: "light" | "dark" }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const avatarUrl = useProfileStore((s) => s.avatarUrl);
  const profile = useProfileStore((s) => s.profile);
  const loadProfile = useProfileStore((s) => s.loadProfile);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Resolve the avatar (and signed URL) for this user once the menu mounts.
  useEffect(() => {
    if (user && !profile) void loadProfile();
  }, [user, profile, loadProfile]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = useMemo(
    () => deriveInitials(profile?.full_name, user?.email),
    [profile?.full_name, user?.email],
  );
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Account";

  if (!user) return null;

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={cn(
          "flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors",
          variant === "light" ? "hover:bg-black/5" : "hover:bg-white/10",
        )}
      >
        <AvatarCircle url={avatarUrl} initials={initials} />
        <ChevronDown
          size={15}
          className={cn(
            "transition-transform",
            open && "rotate-180",
            variant === "light" ? "text-[var(--color-ink-soft)]" : "text-white/80",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="menu"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-2xl border border-[var(--color-border-strong)] bg-white shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-[var(--color-border-strong)] px-4 py-3">
              <AvatarCircle url={avatarUrl} initials={initials} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--color-ink)]">{displayName}</p>
                <p className="truncate text-xs text-[var(--color-ink-faint)]">{user.email}</p>
              </div>
            </div>

            <div className="flex flex-col p-1.5">
              <MenuLink to="/profile" icon={<User size={16} />} label="Profile" onClick={() => setOpen(false)} />
              <MenuLink to="/app" icon={<LayoutGrid size={16} />} label="Open app" onClick={() => setOpen(false)} />
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-stone-surface)]"
              >
                <LogOut size={16} className="text-[var(--color-ink-soft)]" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-stone-surface)]"
    >
      <span className="text-[var(--color-ink-soft)]">{icon}</span>
      {label}
    </Link>
  );
}

export function AvatarCircle({ url, initials, size = 32 }: { url: string | null; initials: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--color-charcoal)] text-white"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display" style={{ fontSize: size * 0.4 }}>
          {initials}
        </span>
      )}
    </span>
  );
}

export function deriveInitials(fullName?: string | null, email?: string | null): string {
  const source = fullName?.trim() || email?.split("@")[0] || "";
  if (!source) return "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
