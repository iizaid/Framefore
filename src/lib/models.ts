import type { Project, Scene } from "@/types";

// A scene's model fields are optional *overrides*. When a scene leaves them
// blank, it inherits the project-level default. These helpers centralize that
// fallback so the board, editor, and export all resolve models identically.

export function resolvedImageModel(scene: Scene, project: Project): string {
  return scene.imageModel.trim() || project.defaultImageModel.trim();
}

export function resolvedVideoModel(scene: Scene, project: Project): string {
  return scene.videoModel.trim() || project.defaultVideoModel.trim();
}

// True when the scene is using its own value rather than the project default.
export function isImageModelOverride(scene: Scene): boolean {
  return scene.imageModel.trim().length > 0;
}

export function isVideoModelOverride(scene: Scene): boolean {
  return scene.videoModel.trim().length > 0;
}
