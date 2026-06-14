export const CANVAS_SHORTCUTS = [
  { keys: ["V"], label: "Select" },
  { keys: ["C"], label: "Connect" },
  { keys: ["H", "Space"], label: "Pan" },
  { keys: ["S"], label: "Scene tool" },
  { keys: ["N"], label: "Note tool" },
  { keys: ["G"], label: "Section tool" },
  { keys: ["F"], label: "Fit view" },
  { keys: ["Ctrl/Cmd", "Z"], label: "Undo" },
  { keys: ["Ctrl/Cmd", "Shift", "Z"], label: "Redo" },
  { keys: ["Ctrl", "Y"], label: "Redo" },
  { keys: ["Delete", "Backspace"], label: "Delete selected note, section, or manual link" },
  { keys: ["?"], label: "Show shortcuts" },
];

export function isEditableShortcutTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  const tagName = element?.tagName;
  return Boolean(
    element?.isContentEditable ||
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT",
  );
}
