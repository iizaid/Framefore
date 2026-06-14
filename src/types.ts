// Framefore domain model.
// Everything here is JSON-serializable so it can live in IndexedDB via Zustand's
// persist middleware. Image binary data is NOT stored here — only image ids that
// point to blobs kept separately in IndexedDB (see lib/images.ts).

export type Platform = "YouTube" | "Reels" | "TikTok" | "Shorts" | "Other";
export type AspectRatio = "16:9" | "9:16" | "1:1";
export type Direction = "ltr" | "rtl";

export type SceneStatus =
  | "Idea"
  | "Draft"
  | "Ready"
  | "Generated"
  | "Needs Revision"
  | "Final";

export type SceneTag =
  | "intro"
  | "hook"
  | "main story"
  | "climax"
  | "outro"
  | "b-roll"
  | "transition";

// The narrative role a scene plays in the story flow.
export type SceneRole =
  | "none"
  | "Hook"
  | "Setup"
  | "Conflict"
  | "Reveal"
  | "Climax"
  | "Outro"
  | "B-roll"
  | "Transition";

// Color labels for quick visual grouping on the board.
export type ColorLabel =
  | "none"
  | "violet"
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "slate";

export interface SceneImage {
  id: string; // key into the IndexedDB blob store
  name: string;
  type: string;
}

// Free-form position of a scene card on the whiteboard canvas. This is PURELY a
// visual workspace coordinate — it has no effect on the video sequence, which is
// always governed by the order of `Project.scenes`. Optional so old projects
// (and freshly created scenes) load fine; the canvas auto-places any scene that
// lacks a layout.
export interface SceneLayout {
  x: number;
  y: number;
}

// A manual, visual relationship drawn between two scene cards on the canvas.
// These are workflow annotations ONLY — they never affect the video sequence,
// which is governed solely by the order of `Project.scenes`. Optional + stored
// at the project level so old projects load untouched.
export type SceneLinkType = "transition" | "continuity" | "reference" | "alternate";

export interface SceneLink {
  id: string;
  fromSceneId: string;
  toSceneId: string;
  label?: string;
  type?: SceneLinkType;
}

export interface Scene {
  id: string;
  title: string;
  subjectName: string; // main character / subject of the shot
  summary: string;
  durationSec: number; // resolved seconds (5/10/15/custom all collapse to a number)
  status: SceneStatus;
  role: SceneRole; // narrative purpose in the story flow
  tag?: SceneTag; // legacy field, retained for backward compatibility
  color: ColorLabel;

  visualPrompt: string;
  negativePrompt: string;

  cameraAngle: string;
  cameraMovement: string;
  mood: string;
  lighting: string;
  visualStyle: string;

  characterNotes: string;
  locationNotes: string;
  motionNotes: string;
  sfxNotes: string;
  musicNotes: string;
  notes: string;

  imageModel: string; // AI model used to generate reference/keyframe images
  videoModel: string; // AI model used to generate the video shot
  narrationPart: string; // the slice of script assigned to this scene
  transitionToNext: string; // how this scene connects to the next
  continuityNotes: string; // characters/locations/objects to keep consistent
  endingBeat: string; // how this scene ends (feeds the next scene's context)
  images: SceneImage[];

  layout?: SceneLayout; // visual position on the canvas (NOT the video order)

  collapsed?: boolean;
  promptDir: Direction;
  narrationDir: Direction;
}

export interface GlobalSettings {
  visualStyle: string;
  cameraStyle: string;
  mood: string;
  colorPalette: string;
  mainCharacter: string;
  mainLocation: string;
  negativePrompt: string;
  targetToolNotes: string;
  outputFormatNotes: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  topic: string;
  platform: Platform;
  aspectRatio: AspectRatio;
  targetLengthSec: number; // 0 = unset
  visualStyle: string;
  mood: string;

  // Project-wide default AI models. Individual scenes may override these; an
  // empty string on a scene means "inherit the project default" (see lib/models.ts).
  defaultImageModel: string;
  defaultVideoModel: string;

  global: GlobalSettings;
  narration: string; // full script for the whole video
  scenes: Scene[];
  links?: SceneLink[]; // manual canvas connections (visual only — not video order)

  createdAt: number;
  updatedAt: number;
}

export const emptyGlobal = (): GlobalSettings => ({
  visualStyle: "",
  cameraStyle: "",
  mood: "",
  colorPalette: "",
  mainCharacter: "",
  mainLocation: "",
  negativePrompt: "",
  targetToolNotes: "",
  outputFormatNotes: "",
});
