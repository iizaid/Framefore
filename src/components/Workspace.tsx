import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  ArrowLeft,
  Plus,
  Download,
  Search,
  Film,
  Home,
  FileText,
  Settings2,
  ChevronsLeft,
  Clock,
  LayoutGrid,
  Frame,
} from "lucide-react";
import type { Project, Scene, SceneStatus } from "@/types";
import { useStore } from "@/store/useStore";
import { cn, formatDuration } from "@/lib/utils";
import { totalSceneSeconds } from "@/lib/estimate";
import { SCENE_STATUSES } from "@/lib/constants";
import { Button, Input, Select } from "./ui/primitives";
import { CompactSceneCard } from "./CompactSceneCard";
import { FlowCanvas } from "./flow/FlowCanvas";
import { TimelineStrip } from "./TimelineStrip";
import { SceneInspector } from "./SceneInspector";
import { SceneEditorModal } from "./SceneEditorModal";
import { ScriptDialog } from "./ScriptDialog";
import { SettingsDialog } from "./SettingsDialog";
import { ExportDialog } from "./ExportDialog";

export function Workspace({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const addScene = useStore((s) => s.addScene);
  const reorderScenes = useStore((s) => s.reorderScenes);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SceneStatus | "all">("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Board (vertical storyboard) vs. Canvas (free whiteboard). Persisted so the
  // user's preferred workflow survives a refresh.
  const [viewMode, setViewMode] = useState<"board" | "canvas">(() => {
    try {
      return localStorage.getItem("framefore-view") === "canvas" ? "canvas" : "board";
    } catch {
      return "board";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("framefore-view", viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Select a scene from the timeline strip and bring it into view on the board.
  const selectScene = (id: string) => {
    setActiveId(id);
    document.getElementById(`scene-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const visibleScenes = useMemo(() => {
    if (!project) return [];
    const q = query.trim().toLowerCase();
    return project.scenes.filter((s) => {
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.visualPrompt.toLowerCase().includes(q) ||
        s.narrationPart.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [project, query, statusFilter]);

  if (!project) {
    return (
      <div className="grid h-full place-items-center text-[var(--color-ink-soft)]">
        <div className="text-center">
          <p>Project not found.</p>
          <Button variant="outline" className="mt-3" onClick={onBack}>
            <ArrowLeft size={16} /> Back to projects
          </Button>
        </div>
      </div>
    );
  }

  const isFiltering = query.trim() !== "" || statusFilter !== "all";

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      reorderScenes(projectId, String(active.id), String(over.id));
    }
  };

  const addAndEdit = () => {
    const before = new Set(project.scenes.map((s) => s.id));
    addScene(projectId);
    // The new scene is appended; find it right after the store updates.
    setTimeout(() => {
      const created = useStore.getState().projects.find((p) => p.id === projectId)?.scenes.find((s) => !before.has(s.id));
      if (created) setEditingId(created.id);
    }, 0);
  };

  const totalSec = totalSceneSeconds(project.scenes);
  const activeScene = activeId ? project.scenes.find((s) => s.id === activeId) ?? null : null;
  const activeIndex = activeScene ? project.scenes.indexOf(activeScene) : -1;

  return (
    <div className="flex h-full min-w-0 overflow-hidden">
      {/* ── Left rail (navigation + global tools) ── */}
      <WorkspaceRail
        onBack={onBack}
        onAddScene={addAndEdit}
        onScript={() => setScriptOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        onExport={() => setExportOpen(true)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* ── Top bar — project info only (tools live in the left rail) ── */}
        <header className="sticky top-0 z-30 border-b border-[var(--color-border-strong)] glass px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to projects" className="sm:hidden">
              <ArrowLeft size={18} />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold leading-tight">{project.title}</h1>
              <p className="truncate text-xs text-[var(--color-ink-faint)]">
                {project.platform} · {project.aspectRatio}
                {project.topic ? ` · ${project.topic}` : ""}
              </p>
            </div>
            {project.scenes.length > 0 && (
              <div className="hidden shrink-0 items-center gap-3 text-xs text-[var(--color-ink-faint)] sm:flex">
                <span className="flex items-center gap-1">
                  <Film size={13} /> {project.scenes.length} scene{project.scenes.length === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {formatDuration(totalSec)}
                </span>
              </div>
            )}

            <Button variant="primary" size="icon" onClick={addAndEdit} aria-label="Add scene" className="h-10 w-10 md:hidden">
              <Plus size={18} />
            </Button>

            {/* View toggle — Board (storyboard) vs Canvas (whiteboard) */}
            <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-[var(--color-border-strong)] bg-white p-0.5">
              <ViewToggle active={viewMode === "board"} label="Board" onClick={() => setViewMode("board")}>
                <LayoutGrid size={14} />
              </ViewToggle>
              <ViewToggle active={viewMode === "canvas"} label="Canvas" onClick={() => setViewMode("canvas")}>
                <Frame size={14} />
              </ViewToggle>
            </div>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          {/* Center column: storyboard wall + docked timeline */}
          <div className="flex min-w-0 flex-1 flex-col pb-[72px] md:pb-0">
          {viewMode === "canvas" ? (
            /* Professional node-based canvas (React Flow) — free-positioned scene
               nodes, locked order spine, editable manual links. */
            <FlowCanvas
              project={project}
              activeId={activeId}
              onSelect={setActiveId}
              onEdit={(id) => setEditingId(id)}
            />
          ) : (
          /* Storyboard wall — clicking empty space deselects */
          <main
            className="dot-canvas min-w-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 lg:px-8 lg:py-6"
            onClick={(e) => { if (e.target === e.currentTarget) setActiveId(null); }}
          >
            <div
              className="mx-auto max-w-6xl"
              onClick={(e) => { if (e.target === e.currentTarget) setActiveId(null); }}
            >
              {/* compact filter toolbar */}
              {project.scenes.length > 0 && (
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[180px] flex-1 sm:w-40 sm:flex-none">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search scenes…" className="h-8 pl-8 text-xs" />
                  </div>
                  <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SceneStatus | "all")} className="h-8 w-auto min-w-[132px] text-xs">
                    <option value="all">All statuses</option>
                    {SCENE_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                  <span className="ml-auto hidden text-xs text-[var(--color-ink-faint)] sm:block">
                    {project.scenes.length} scene{project.scenes.length === 1 ? "" : "s"}
                  </span>
                </div>
              )}

              {project.scenes.length === 0 ? (
                <BoardEmpty onAdd={addAndEdit} />
              ) : (
                <>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={visibleScenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      <div>
                        {visibleScenes.map((scene, i) => {
                          const realIndex = project.scenes.indexOf(scene);
                          return (
                            <CompactSceneCard
                              key={scene.id}
                              scene={scene}
                              index={realIndex}
                              project={project}
                              isLast={i === visibleScenes.length - 1}
                              isActive={scene.id === activeId}
                              onEdit={() => setEditingId(scene.id)}
                              onSelect={() => setActiveId(scene.id)}
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                  {visibleScenes.length === 0 && isFiltering && (
                    <p className="py-12 text-center text-sm text-[var(--color-ink-faint)]">No scenes match your filters.</p>
                  )}

                  {/* add-scene node continues the chain */}
                  <div className="grid grid-cols-[36px_1fr] gap-3 pb-6 sm:grid-cols-[44px_1fr] sm:gap-5">
                    <div className="flex justify-center">
                      <div className="z-10 grid h-8 w-8 place-items-center rounded-full border border-dashed border-[var(--color-border-strong)] bg-white text-[var(--color-ink-faint)] sm:h-9 sm:w-9">
                        <Plus size={15} />
                      </div>
                    </div>
                    <button
                      onClick={addAndEdit}
                      className="flex items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-strong)] py-3.5 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:border-neutral-400 hover:bg-neutral-50"
                    >
                      <Plus size={16} /> Add scene
                    </button>
                  </div>
                </>
              )}
            </div>
          </main>
          )}

          {/* Docked timeline overview — supporting tool, under the board */}
          {project.scenes.length > 0 && (
            <div className="shrink-0 border-t border-[var(--color-border-strong)] bg-white/80 backdrop-blur-sm">
              <TimelineStrip
                project={project}
                activeId={activeId}
                open={timelineOpen}
                onToggle={() => setTimelineOpen((o) => !o)}
                onSelect={selectScene}
                onReorder={(fromId, toId) => reorderScenes(projectId, fromId, toId)}
              />
            </div>
          )}
          </div>

          {/* Right panel — Scene Inspector, only when a scene is selected */}
          {activeScene && (
            <aside className="hidden w-[340px] shrink-0 border-l border-[var(--color-border-strong)] bg-white lg:block">
              <SceneInspector
                project={project}
                scene={activeScene}
                index={activeIndex}
                onClose={() => setActiveId(null)}
                onEdit={() => setEditingId(activeScene.id)}
              />
            </aside>
          )}
        </div>
      </div>

      {activeScene && (
        <MobileInspectorSheet
          project={project}
          scene={activeScene}
          index={activeIndex}
          onClose={() => setActiveId(null)}
          onEdit={() => setEditingId(activeScene.id)}
        />
      )}

      <MobileBottomNav
        onBack={onBack}
        onBoard={() => setViewMode("board")}
        onAddScene={addAndEdit}
        onScript={() => setScriptOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        onExport={() => setExportOpen(true)}
      />

      <SceneEditorModal open={editingId !== null} onClose={() => setEditingId(null)} project={project} sceneId={editingId} />
      <ScriptDialog open={scriptOpen} onClose={() => setScriptOpen(false)} project={project} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} project={project} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} project={project} />
    </div>
  );
}

function MobileInspectorSheet({
  project,
  scene,
  index,
  onClose,
  onEdit,
}: {
  project: Project;
  scene: Scene;
  index: number;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="lg:hidden">
      <button
        className="fixed inset-0 z-40 bg-black/25"
        aria-label="Close inspector"
        onClick={onClose}
      />
      <aside className="fixed inset-x-0 bottom-0 z-50 max-h-[82dvh] overflow-hidden rounded-t-2xl border-t border-[var(--color-border-strong)] bg-white shadow-2xl">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-neutral-300" aria-hidden />
        <div className="max-h-[calc(82dvh-0.75rem)] overflow-hidden">
          <SceneInspector project={project} scene={scene} index={index} onClose={onClose} onEdit={onEdit} />
        </div>
      </aside>
    </div>
  );
}

function MobileBottomNav({
  onBack,
  onBoard,
  onAddScene,
  onScript,
  onSettings,
  onExport,
}: {
  onBack: () => void;
  onBoard: () => void;
  onAddScene: () => void;
  onScript: () => void;
  onSettings: () => void;
  onExport: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border-strong)] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-14px_34px_-28px_rgba(0,0,0,0.6)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
        <MobileNavBtn label="Projects" onClick={onBack}><Home size={17} /></MobileNavBtn>
        <MobileNavBtn label="Board" onClick={onBoard}><LayoutGrid size={17} /></MobileNavBtn>
        <MobileNavBtn label="Add" primary onClick={onAddScene}><Plus size={18} /></MobileNavBtn>
        <MobileNavBtn label="Script" onClick={onScript}><FileText size={17} /></MobileNavBtn>
        <MobileNavBtn label="Export" onClick={onExport}><Download size={17} /></MobileNavBtn>
        <MobileNavBtn label="Settings" onClick={onSettings}><Settings2 size={17} /></MobileNavBtn>
      </div>
    </nav>
  );
}

function MobileNavBtn({
  children,
  label,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition-colors",
        primary
          ? "bg-[#121212] text-white"
          : "text-[var(--color-ink-faint)] hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)]",
      )}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function WorkspaceRail({
  onBack,
  onAddScene,
  onScript,
  onSettings,
  onExport,
}: {
  onBack: () => void;
  onAddScene: () => void;
  onScript: () => void;
  onSettings: () => void;
  onExport: () => void;
}) {
  // Remember the expanded/collapsed preference across sessions.
  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem("framefore-rail") !== "collapsed";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("framefore-rail", expanded ? "expanded" : "collapsed");
    } catch {
      /* ignore */
    }
  }, [expanded]);

  return (
    <nav
      className={cn(
        "hidden shrink-0 flex-col gap-0.5 border-r border-[var(--color-border-strong)] bg-[var(--color-surface-2)] p-2 transition-[width] duration-200 md:flex",
        expanded ? "w-52 max-lg:w-16" : "w-16",
      )}
    >
      {/* Brand + collapse toggle */}
      <div className={cn("mb-2 flex items-center", expanded ? "justify-between pl-1.5 pr-0.5 max-lg:justify-center max-lg:px-0" : "justify-center")}>
        <a href="/" title="Go to home page" className="flex items-center gap-2 transition-transform hover:scale-[1.03]">
          <img src="/black.svg" alt="Framefore home" className="h-7 w-7" />
          {expanded && <span className="text-sm font-semibold tracking-tight text-[var(--color-ink)] max-lg:hidden">Framefore</span>}
        </a>
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="grid h-7 w-7 place-items-center rounded-lg text-[var(--color-ink-faint)] transition-colors hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)] max-lg:hidden"
          >
            <ChevronsLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <RailItem label="Projects" expanded={expanded} onClick={onBack}><Home size={18} /></RailItem>
      <RailItem label="Board" expanded={expanded} active><Film size={18} /></RailItem>

      <div className="my-2 h-px shrink-0 bg-[var(--color-border-strong)]" />

      {/* Tools */}
      <RailItem label="Add Scene" expanded={expanded} onClick={onAddScene}><Plus size={18} /></RailItem>
      <RailItem label="Script" expanded={expanded} onClick={onScript}><FileText size={18} /></RailItem>
      <RailItem label="Settings" expanded={expanded} onClick={onSettings}><Settings2 size={18} /></RailItem>
      <RailItem label="Export" expanded={expanded} onClick={onExport}><Download size={18} /></RailItem>

      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          className="mt-auto grid h-10 w-10 place-items-center self-center rounded-[12px] text-[var(--color-ink-faint)] transition-colors hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)]"
        >
          <ChevronsLeft size={18} className="rotate-180" />
        </button>
      )}
    </nav>
  );
}

function RailItem({
  children,
  label,
  expanded,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  expanded: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={expanded ? undefined : label}
      aria-label={label}
      className={cn(
        "flex h-10 items-center rounded-[12px] text-sm font-medium transition-colors",
        expanded ? "gap-3 px-3 max-lg:w-10 max-lg:justify-center max-lg:self-center max-lg:px-0" : "w-10 justify-center self-center px-0",
        active
          ? "bg-[#121212] text-white"
          : "text-[var(--color-ink-faint)] hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)]",
      )}
    >
      <span className="grid shrink-0 place-items-center">{children}</span>
      {expanded && <span className="max-lg:hidden">{label}</span>}
    </button>
  );
}

function ViewToggle({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={`${label} view`}
      aria-label={`${label} view`}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-[#121212] text-white"
          : "text-[var(--color-ink-faint)] hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)]",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function BoardEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-strong)] py-20 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-neutral-900 text-white">
        <Film size={24} />
      </div>
      <h3 className="text-lg font-semibold">Start your story flow</h3>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--color-ink-soft)]">
        Plan prompts, references, narration, and transitions before generating video. Each scene is one short AI shot — usually 10–15s — that flows into the next.
      </p>
      <Button variant="primary" className="mt-5" onClick={onAdd}>
        <Plus size={18} /> Add your first scene
      </Button>
    </div>
  );
}
