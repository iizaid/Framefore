import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { ProjectsPage } from "@/components/ProjectsPage";
import { Workspace } from "@/components/Workspace";

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

  return (
    <>
      {hydrated && (activeExists ? <Workspace projectId={activeId!} onBack={back} /> : <ProjectsPage onOpen={open} />)}
      <AppLoadingScreen ready={hydrated} />
    </>
  );
}
