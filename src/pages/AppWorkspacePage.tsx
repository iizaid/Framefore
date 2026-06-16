import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useStore, isProjectVisible } from "@/store/useStore";
import { useAuthStore } from "@/store/useAuthStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ProjectsPage } from "@/components/ProjectsPage";
import { Workspace } from "@/components/Workspace";
import { Button } from "@/components/ui/primitives";

// The Framefore workspace, mounted at /app.
//
// Top-level navigation (landing ↔ /app ↔ /login …) is handled by React Router in
// App.tsx. *Inside* the workspace we keep the original lightweight hash router
// ("#/project/<id>") so a refresh stays inside the open project — pathname and
// hash are independent, so /app#/project/<id> works exactly like before. This is
// deliberately untouched so local projects, persistence, and the canvas behave
// identically to the pre-routing app.
function parseHash(): string | null {
  const m = window.location.hash.match(/^#\/project\/(.+)$/);
  return m ? m[1] : null;
}

export function AppWorkspacePage() {
  const hydrated = useStore((s) => s.hydrated);
  const projects = useStore((s) => s.projects);
  const currentOwnerUserId = useStore((s) => s.currentOwnerUserId);
  const authInitialized = useAuthStore((s) => s.initialized);
  const [activeId, setActiveId] = useState<string | null>(parseHash());

  // Local data must be rehydrated AND (when auth is configured) the session must
  // be resolved before we render the list — otherwise a signed-in user could see
  // a one-frame flash of guest projects before the owner filter is applied.
  const authReady = !isSupabaseConfigured || authInitialized;
  const booting = !hydrated || !authReady;

  useEffect(() => {
    const onHash = () => setActiveId(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const open = (id: string) => {
    window.location.hash = `/project/${id}`;
    setActiveId(id);
  };
  const back = () => {
    window.location.hash = "";
    setActiveId(null);
  };

  // Resolve the hash target against the active account context. A project is
  // openable only if it exists AND is visible to the current owner — so a signed-in
  // user can't open another account's (or an un-imported guest) project via a
  // direct /app#/project/<id> link. Project contents are never rendered otherwise.
  const activeProject = activeId ? projects.find((p) => p.id === activeId) : undefined;
  const canOpen = activeProject && isProjectVisible(activeProject, currentOwnerUserId);
  // The hash points at a real project that simply isn't ours → clean blocked state
  // (distinct from a stale hash pointing at a deleted project, which just lists).
  const blocked = Boolean(activeId) && Boolean(activeProject) && !canOpen;

  if (booting) return <WorkspaceBooting />;

  return canOpen ? (
    <Workspace projectId={activeId!} onBack={back} />
  ) : blocked ? (
    <ProjectUnavailable onBack={back} />
  ) : (
    <ProjectsPage onOpen={open} />
  );
}

// Lightweight workspace boot state. A spinner only appears after ~220ms so quick
// loads (the common case) show nothing at all — no branded full-screen splash.
function WorkspaceBooting() {
  const [showSpinner, setShowSpinner] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShowSpinner(true), 220);
    return () => window.clearTimeout(t);
  }, []);

  if (!showSpinner) return <div className="min-h-screen bg-[var(--color-bg)]" />;
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-bg)]">
      <div className="flex items-center gap-2.5 text-sm text-[var(--color-ink-soft)]">
        <Loader2 size={16} className="animate-spin" />
        Preparing workspace…
      </div>
    </div>
  );
}

// Shown when a direct project link resolves to a project the current account may
// not see. No project data is rendered — just a clean exit back to the list.
function ProjectUnavailable({ onBack }: { onBack: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-6">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-2xl text-[var(--ff-ink)]">Project not available</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          This project isn't available for the account you're signed in with.
        </p>
        <Button variant="primary" size="md" className="mt-6" onClick={onBack}>
          Back to projects
        </Button>
      </div>
    </div>
  );
}
