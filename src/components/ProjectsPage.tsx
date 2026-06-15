import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clapperboard,
  Plus,
  MoreVertical,
  Copy,
  Pencil,
  Trash2,
  Film,
  Clock,
  Search,
  Download,
  X,
} from "lucide-react";
import { useStore, isProjectVisible } from "@/store/useStore";
import { useAuthStore } from "@/store/useAuthStore";
import { AccountMenu } from "@/components/account/AccountMenu";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Project } from "@/types";
import { formatDuration, relativeTime } from "@/lib/utils";
import { totalSceneSeconds } from "@/lib/estimate";
import { scoreProject } from "@/lib/readiness";
import { Button, Card, Input } from "./ui/primitives";
import { ConfirmDialog } from "./ui/Modal";
import { ProjectDialog, type ProjectDraft } from "./ProjectDialog";
import { ReadinessRing } from "./ui/widgets";
import { toast } from "./ui/toast";

export function ProjectsPage({ onOpen }: { onOpen: (id: string) => void }) {
  const projects = useStore((s) => s.projects);
  const currentOwnerUserId = useStore((s) => s.currentOwnerUserId);
  const importGuestProjectsToUser = useStore((s) => s.importGuestProjectsToUser);
  const createProject = useStore((s) => s.createProject);
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const duplicateProject = useStore((s) => s.duplicateProject);
  const user = useAuthStore((s) => s.user);

  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; project?: Project } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  // "Not now" hides the import banner for this session only — it never deletes
  // anything, and the banner returns next session if guest projects still exist.
  const [importDismissed, setImportDismissed] = useState(
    () => sessionStorage.getItem("framefore-import-dismissed") === "1",
  );

  // Only show projects that belong to the active context (signed-in account, or
  // guest when signed out). Guest projects are never auto-shown to an account.
  const visibleProjects = useMemo(
    () => projects.filter((p) => isProjectVisible(p, currentOwnerUserId)),
    [projects, currentOwnerUserId],
  );

  // Guest projects only matter for the import banner when a user is signed in.
  const guestCount = useMemo(
    () => projects.filter((p) => (p.ownerUserId ?? null) === null).length,
    [projects],
  );
  const showImportBanner = Boolean(user) && guestCount > 0 && !importDismissed;

  const dismissImport = () => {
    sessionStorage.setItem("framefore-import-dismissed", "1");
    setImportDismissed(true);
  };

  const handleImport = () => {
    if (!user) return;
    const n = importGuestProjectsToUser(user.id);
    toast(n === 1 ? "1 project imported to your account" : `${n} projects imported to your account`);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleProjects;
    return visibleProjects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.topic.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [visibleProjects, query]);

  const handleSubmit = (draft: ProjectDraft) => {
    const patch = {
      title: draft.title,
      description: draft.description,
      topic: draft.topic,
      platform: draft.platform,
      aspectRatio: draft.aspectRatio,
      targetLengthSec: draft.targetMinutes * 60,
      visualStyle: draft.visualStyle,
      mood: draft.mood,
    };
    if (dialog?.mode === "edit" && dialog.project) {
      updateProject(dialog.project.id, patch);
      toast("Project updated");
    } else {
      const id = createProject(patch);
      toast("Project created");
      onOpen(id);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      {/* Header */}
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <a href="/" title="Back to home page" className="transition-opacity hover:opacity-75">
              <img src="/black.svg" alt="Framefore home" className="h-9 w-9" />
            </a>
            <h1 className="font-display text-3xl text-[var(--color-charcoal)] sm:text-4xl">Framefore</h1>
          </div>
          <p className="max-w-md text-sm text-[var(--color-ink-soft)]">
            Plan AI videos scene by scene. Write prompts, attach references, balance narration,
            and export production-ready prompt packs.
          </p>
        </div>
        <div className="flex items-center gap-3 max-sm:w-full">
          <AccountControl />
          <Button variant="primary" size="md" className="flex-1 sm:w-auto sm:flex-none" onClick={() => setDialog({ mode: "create" })}>
            <Plus size={18} /> New Project
          </Button>
        </div>
      </header>

      {showImportBanner && (
        <ImportBanner count={guestCount} onImport={handleImport} onDismiss={dismissImport} />
      )}

      {visibleProjects.length > 0 && (
        <div className="relative mb-6 max-w-sm max-sm:max-w-none">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="pl-9"
          />
        </div>
      )}

      {visibleProjects.length === 0 ? (
        <EmptyState onCreate={() => setDialog({ mode: "create" })} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <ProjectGridCard
              key={p.id}
              project={p}
              index={i}
              onOpen={() => onOpen(p.id)}
              onEdit={() => setDialog({ mode: "edit", project: p })}
              onDuplicate={() => {
                const id = duplicateProject(p.id);
                if (id) toast("Project duplicated");
              }}
              onDelete={() => setConfirmDelete(p)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-12 text-center text-sm text-[var(--color-ink-faint)]">
              No projects match “{query}”.
            </p>
          )}
        </div>
      )}

      <ProjectDialog
        open={!!dialog}
        mode={dialog?.mode ?? "create"}
        initial={dialog?.project}
        onClose={() => setDialog(null)}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            deleteProject(confirmDelete.id);
            toast("Project deleted", "info");
          }
        }}
        title="Delete project?"
        message={`“${confirmDelete?.title}” and all its scenes will be permanently removed. This can't be undone.`}
      />
    </div>
  );
}

// Account area in the workspace header. Local-first stays the default: when auth
// isn't configured we render nothing, so the workspace is unchanged for purely
// local users. Signed-in users get the compact avatar menu (name/email + actions
// live inside the dropdown only — Notion/Linear style).
function AccountControl() {
  const user = useAuthStore((s) => s.user);

  if (!isSupabaseConfigured) return null;

  if (!user) {
    return (
      <Link to="/login">
        <Button variant="ghost" size="md">
          Sign in
        </Button>
      </Link>
    );
  }

  return <AccountMenu variant="light" />;
}

// Shown to a signed-in user when guest (pre-account) local projects exist on
// this browser. Importing claims them for the current account; "Not now" hides
// the banner for the session. Neither action ever deletes a project.
function ImportBanner({
  count,
  onImport,
  onDismiss,
}: {
  count: number;
  onImport: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--color-border-strong)] bg-white p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-stone-surface)] text-[var(--color-ink-soft)]">
        <Download size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--color-ink)]">Local projects found</p>
        <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">
          {count === 1 ? "1 project was" : `${count} projects were`} created before this account was
          connected. Import {count === 1 ? "it" : "them"} to keep {count === 1 ? "it" : "them"} with
          this account.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          <X size={14} /> Not now
        </Button>
        <Button variant="primary" size="sm" onClick={onImport}>
          <Download size={14} /> Import to this account
        </Button>
      </div>
    </div>
  );
}

function ProjectGridCard({
  project,
  index,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  project: Project;
  index: number;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const duration = totalSceneSeconds(project.scenes);
  const readiness = scoreProject(project).score;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
    >
      <Card
        className="card-glow group relative cursor-pointer overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5"
        onClick={onOpen}
      >
        {/* aspect-ratio tag accent */}
        <div className="mb-4 flex items-start justify-between">
          <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-[var(--color-ink-soft)]">
            {project.platform} · {project.aspectRatio}
          </span>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" onClick={() => setMenu((m) => !m)} aria-label="Menu">
              <MoreVertical size={16} />
            </Button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-elevated)] py-1 shadow-xl">
                  <MenuItem icon={<Pencil size={14} />} label="Edit" onClick={() => { setMenu(false); onEdit(); }} />
                  <MenuItem icon={<Copy size={14} />} label="Duplicate" onClick={() => { setMenu(false); onDuplicate(); }} />
                  <MenuItem icon={<Trash2 size={14} />} label="Delete" danger onClick={() => { setMenu(false); onDelete(); }} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold">{project.title}</h3>
            <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-[var(--color-ink-soft)]">
              {project.description || project.topic || "No description yet."}
            </p>
          </div>
          {project.scenes.length > 0 && <ReadinessRing score={readiness} size={40} />}
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-ink-faint)]">
          <span className="flex items-center gap-1.5">
            <Film size={13} /> {project.scenes.length} scenes
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} /> {formatDuration(duration)}
          </span>
          <span className="ml-auto">{relativeTime(project.updatedAt)}</span>
        </div>
      </Card>
    </motion.div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-neutral-100 ${
        danger ? "text-rose-400" : "text-[var(--color-ink)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)]/40 px-5 py-16 text-center sm:px-6 sm:py-24"
    >
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-neutral-900">
        <Clapperboard className="text-white" size={30} />
      </div>
      <h2 className="text-xl font-semibold">Your production wall is empty</h2>
      <p className="mt-2 max-w-sm text-sm text-[var(--color-ink-soft)]">
        Create your first project to start planning a video as a sequence of scenes — prompts,
        references, narration, and exports all in one board.
      </p>
      <Button variant="primary" className="mt-6" onClick={onCreate}>
        <Plus size={18} /> Create your first project
      </Button>
    </motion.div>
  );
}
