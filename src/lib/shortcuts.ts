export const CANVAS_SHORTCUTS = [
  { keys: ["V"], label: "Select" },
  { keys: ["C"], label: "Connect" },
  { keys: ["H", "Space"], label: "Pan" },
  { keys: ["S", "A"], label: "Scene tool" },
  { keys: ["N"], label: "Note tool" },
  { keys: ["G"], label: "Section tool" },
  { keys: ["F"], label: "Fit view" },
  { keys: ["Ctrl/Cmd", "Z"], label: "Undo" },
  { keys: ["Ctrl/Cmd", "Shift", "Z"], label: "Redo" },
  { keys: ["Ctrl", "Y"], label: "Redo" },
  { keys: ["Delete", "Backspace"], label: "Delete selected note, section, or manual link" },
  { keys: ["?"], label: "Show shortcuts" },
];

export type CanvasShortcutAction =
  | "select"
  | "connect"
  | "pan"
  | "scene"
  | "note"
  | "section"
  | "fit";

export const CANVAS_SHORTCUT_CODES = {
  select: "KeyV",
  connect: "KeyC",
  pan: "KeyH",
  scene: "KeyS",
  sceneAlias: "KeyA",
  note: "KeyN",
  section: "KeyG",
  fit: "KeyF",
  undo: "KeyZ",
  redo: "KeyY",
  help: "Slash",
  space: "Space",
} as const;

export function isEditableShortcutTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  const tagName = element?.tagName;
  const modalOpen = typeof document !== "undefined" && document.querySelector('[aria-modal="true"]');
  return Boolean(
    modalOpen ||
      element?.isContentEditable ||
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT",
  );
}

export function isCode(event: KeyboardEvent, code: string) {
  return event.code === code;
}

export function isModKey(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey;
}

export function isUndoShortcut(event: KeyboardEvent) {
  return isModKey(event) && !event.shiftKey && isCode(event, CANVAS_SHORTCUT_CODES.undo);
}

export function isRedoShortcut(event: KeyboardEvent) {
  return (
    (isModKey(event) && event.shiftKey && isCode(event, CANVAS_SHORTCUT_CODES.undo)) ||
    (event.ctrlKey && isCode(event, CANVAS_SHORTCUT_CODES.redo))
  );
}

export function isHelpShortcut(event: KeyboardEvent) {
  return event.key === "?" || (event.shiftKey && isCode(event, CANVAS_SHORTCUT_CODES.help));
}

export function getCanvasShortcutAction(event: KeyboardEvent): CanvasShortcutAction | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (isCode(event, CANVAS_SHORTCUT_CODES.select)) return "select";
  if (isCode(event, CANVAS_SHORTCUT_CODES.connect)) return "connect";
  if (isCode(event, CANVAS_SHORTCUT_CODES.pan) || isCode(event, CANVAS_SHORTCUT_CODES.space) || event.key === " ") {
    return "pan";
  }
  if (isCode(event, CANVAS_SHORTCUT_CODES.scene) || isCode(event, CANVAS_SHORTCUT_CODES.sceneAlias)) return "scene";
  if (isCode(event, CANVAS_SHORTCUT_CODES.note)) return "note";
  if (isCode(event, CANVAS_SHORTCUT_CODES.section)) return "section";
  if (isCode(event, CANVAS_SHORTCUT_CODES.fit)) return "fit";
  return null;
}
