import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { ProjectsPage } from "@/components/ProjectsPage";
import { Workspace } from "@/components/Workspace";
import { Toaster } from "@/components/ui/toast";

// Tiny hash-based router so a page refresh keeps you inside the open project.
// "#/project/<id>" → workspace; anything else → projects dashboard.
function parseHash(): string | null {
  const m = window.location.hash.match(/^#\/project\/(.+)$/);
  return m ? m[1] : null;
}

export default function App() {
  const hydrated = useStore((s) => s.hydrated);
  const projects = useStore((s) => s.projects);
  const [activeId, setActiveId] = useState<string | null>(parseHash());

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

  // Guard against a stale hash pointing at a deleted project.
  const activeExists = activeId && projects.some((p) => p.id === activeId);

  if (!hydrated) {
    return (
      <div className="grid h-full place-items-center">
        <div className="flex flex-col items-center gap-3 text-[var(--color-ink-faint)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
          <span className="text-sm">Loading your board…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {activeExists ? (
        <Workspace projectId={activeId!} onBack={back} />
      ) : (
        <ProjectsPage onOpen={open} />
      )}
      <Toaster />
    </>
  );
}
