import type {
  AspectRatio,
  ColorLabel,
  Platform,
  SceneRole,
  SceneStatus,
  SceneTag,
} from "@/types";

export const SCENE_ROLES: SceneRole[] = [
  "none",
  "Hook",
  "Setup",
  "Conflict",
  "Reveal",
  "Climax",
  "Outro",
  "B-roll",
  "Transition",
];

export const PLATFORMS: Platform[] = [
  "YouTube",
  "Reels",
  "TikTok",
  "Shorts",
  "Other",
];

export const ASPECT_RATIOS: AspectRatio[] = ["16:9", "9:16", "1:1"];

export const SCENE_STATUSES: SceneStatus[] = [
  "Idea",
  "Draft",
  "Ready",
  "Generated",
  "Needs Revision",
  "Final",
];

export const SCENE_TAGS: SceneTag[] = [
  "intro",
  "hook",
  "main story",
  "climax",
  "outro",
  "b-roll",
  "transition",
];

export const DURATION_PRESETS = [5, 10, 15];

// Curated current-generation AI models (as of early 2026). Used as suggestions —
// users can still type a custom model name.
export const IMAGE_MODELS = [
  "Midjourney v7",
  "Flux 1.1 Pro",
  "Flux.1 Dev",
  "Stable Diffusion 3.5",
  "DALL·E 3",
  "Google Imagen 3",
  "Gemini 2.5 Flash Image (Nano Banana)",
  "Ideogram 3.0",
  "Recraft V3",
  "Adobe Firefly Image 3",
  "Leonardo Phoenix",
  "Seedream 3.0",
];

export const VIDEO_MODELS = [
  "Runway Gen-4",
  "Runway Gen-3 Alpha",
  "OpenAI Sora",
  "Google Veo 3",
  "Google Veo 2",
  "Kling 2.1",
  "Luma Ray 2",
  "Pika 2.2",
  "Hailuo MiniMax 02",
  "Seedance 1.0",
  "Hunyuan Video",
  "Wan 2.1",
  "LTX Video",
  "Adobe Firefly Video",
];

// Status badge styling for the white theme: neutral text + a small colored dot.
export const STATUS_STYLE: Record<SceneStatus, { dot: string; text: string; ring: string }> = {
  Idea: { dot: "bg-neutral-400", text: "text-neutral-600", ring: "ring-neutral-200" },
  Draft: { dot: "bg-blue-500", text: "text-neutral-600", ring: "ring-neutral-200" },
  Ready: { dot: "bg-amber-500", text: "text-neutral-600", ring: "ring-neutral-200" },
  Generated: { dot: "bg-sky-500", text: "text-neutral-600", ring: "ring-neutral-200" },
  "Needs Revision": { dot: "bg-rose-500", text: "text-neutral-600", ring: "ring-neutral-200" },
  Final: { dot: "bg-emerald-500", text: "text-neutral-600", ring: "ring-neutral-200" },
};

export const COLOR_LABELS: Record<ColorLabel, { bar: string; label: string }> = {
  none: { bar: "transparent", label: "None" },
  violet: { bar: "#8b5cf6", label: "Violet" },
  blue: { bar: "#3b82f6", label: "Blue" },
  emerald: { bar: "#10b981", label: "Emerald" },
  amber: { bar: "#f59e0b", label: "Amber" },
  rose: { bar: "#f43f5e", label: "Rose" },
  slate: { bar: "#64748b", label: "Slate" },
};

// Suggested values to power lightweight datalist-style hints in scene fields.
export const SUGGESTIONS = {
  cameraAngle: ["Eye level", "Low angle", "High angle", "Bird's eye", "Dutch angle", "Over-the-shoulder", "Close-up", "Wide shot"],
  cameraMovement: ["Static", "Slow push-in", "Pull-out", "Pan left", "Pan right", "Tilt up", "Tracking", "Handheld", "Crane", "Drone orbit"],
  mood: ["Tense", "Mysterious", "Hopeful", "Melancholic", "Energetic", "Calm", "Ominous", "Triumphant"],
  lighting: ["Natural daylight", "Golden hour", "Neon", "Low-key / noir", "High-key", "Candlelight", "Moonlight", "Studio"],
  visualStyle: ["Cinematic realism", "Anime", "3D render", "Cyberpunk", "Documentary", "Vintage film", "Hyperrealistic", "Surreal"],
};
