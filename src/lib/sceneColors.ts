/**
 * sceneColors.ts — Framefore auto-scene color system
 *
 * Used exclusively when scene.color === "none" (the default for all new scenes).
 * When a user has explicitly set scene.color to something other than "none",
 * the existing `sceneColor(scene.color)` from colors.ts is used instead — this
 * file never overrides a user-assigned color.
 *
 * All values are stable hex strings — safe to use in inline styles, which is the
 * correct approach here because Tailwind purges any dynamic class names that are
 * built at runtime (e.g. `bg-${color}`). Inline styles with literal hex values
 * are always safe and never purged.
 *
 * Color selection is deterministic from scene id, with index as a fallback.
 * No Math.random(). No unstable output between renders.
 */

export interface AutoSceneColor {
  /** Accent hex — used for top border, number badge, timeline block border */
  accent: string;
  /** Soft background hex — used for timeline segment fill, subtle card tints */
  soft: string;
  /** Border hex — used for timeline segment border, card accent border */
  border: string;
  /** Text hex — used on soft signal surfaces when needed */
  text: string;
  /** Human label */
  label: string;
}

/**
 * 8-entry Framefore production palette.
 * Distinct enough to link canvas cards and timeline blocks, restrained enough
 * to avoid rainbow noise across dense projects.
 */
const FRAMEFORE_AUTO_SCENE_PALETTE: AutoSceneColor[] = [
  { accent: "#834DFB", soft: "#EEE8FF", border: "#CDBDFF", text: "#18102B", label: "Electric Violet" },
  { accent: "#0091FF", soft: "#E7F4FF", border: "#B7DEFF", text: "#090C1D", label: "Signal Blue" },
  { accent: "#F0E100", soft: "#FFF9B8", border: "#E8DA39", text: "#18102B", label: "Turbo Yellow" },
  { accent: "#514B81", soft: "#ECEAF8", border: "#C8C2EA", text: "#18102B", label: "Muted Violet" },
  { accent: "#4D8B83", soft: "#E2F1EE", border: "#B7D8D2", text: "#090C1D", label: "Teal" },
  { accent: "#9A5F68", soft: "#F1E0E3", border: "#D6B2B9", text: "#18102B", label: "Rose Brown" },
  { accent: "#B9823A", soft: "#F6E8D1", border: "#E1C99D", text: "#18102B", label: "Amber" },
  { accent: "#62615A", soft: "#EAE7DF", border: "#C9C4B8", text: "#18102B", label: "Graphite" },
];

function hashSceneId(sceneId: string): number {
  let hash = 0;
  for (let i = 0; i < sceneId.length; i += 1) {
    hash = (hash * 31 + sceneId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Returns the auto scene color for a given scene id and index.
 * Called only when scene.color === "none".
 *
 * @param sceneId - Stable scene id when available.
 * @param index - Scene position fallback for older/defensive call sites.
 */
export function getAutoSceneColor(sceneId: string, index: number): AutoSceneColor {
  const seed = sceneId ? hashSceneId(sceneId) : index;
  return FRAMEFORE_AUTO_SCENE_PALETTE[Math.abs(seed) % FRAMEFORE_AUTO_SCENE_PALETTE.length];
}
