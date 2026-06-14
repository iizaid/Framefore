import { get, set, del, createStore } from "idb-keyval";
import { nanoid } from "nanoid";
import type { SceneImage } from "@/types";

// Image blobs live in a dedicated IndexedDB store, separate from the JSON state.
// We keep only ids in the project model and resolve blobs to object URLs on demand.
const imageStore = createStore("framefore-images", "blobs");

export async function saveImage(file: File): Promise<SceneImage> {
  const id = nanoid();
  await set(id, file, imageStore);
  return { id, name: file.name, type: file.type };
}

export async function getImageUrl(id: string): Promise<string | null> {
  const blob = await get<Blob>(id, imageStore);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function deleteImage(id: string): Promise<void> {
  await del(id, imageStore);
}

export async function getImageBlob(id: string): Promise<Blob | null> {
  return (await get<Blob>(id, imageStore)) ?? null;
}
