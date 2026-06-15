// =============================================================================
// Profile data layer (Phase 4.4)
// =============================================================================
// Thin, safe wrapper around Supabase for the Profile/Account page. Rules:
//   * Supabase client only — never the service role, never manual token storage.
//   * Every operation requires an authenticated user and derives the user id
//     from the live session (auth.getUser()), NEVER from UI input.
//   * Writes only ever touch the caller's own row / own storage folder. RLS is
//     the hard wall (migrations 0003 + 0008); this layer is the friendly front.
//   * Validate inputs/files BEFORE sending so users get instant, clear errors
//     instead of opaque Postgres/Storage failures.
// =============================================================================

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/** Editable profile row shape (subset of public.profiles the UI cares about). */
export interface Profile {
  id: string;
  full_name: string | null;
  nickname: string | null;
  bio: string | null;
  phone_number: string | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
  profile_completed: boolean;
}

/** The fields a user may edit from the Profile page. */
export interface ProfileInput {
  full_name?: string | null;
  nickname?: string | null;
  bio?: string | null;
  phone_number?: string | null;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
}

/** Uniform result type so callers never deal with thrown exceptions. */
export type Result<T> = { data: T; error: null } | { data: null; error: string };

const AVATAR_BUCKET = "avatars";
const SIGNED_URL_TTL = 60 * 60; // 1 hour
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB (matches bucket limit)
const MAX_AVATAR_SOURCE_BYTES = 8 * 1024 * 1024; // cropped before upload
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const PROFILE_COLUMNS =
  "id, full_name, nickname, bio, phone_number, country, city, timezone, avatar_path, avatar_url, profile_completed";

// Reused guard so each exported function fails the same clean way when env vars
// are missing rather than dereferencing a null client.
function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    return { client: null, error: "Account features are temporarily unavailable." as const };
  }
  return { client: supabase, error: null };
}

async function requireUserId(): Promise<Result<string>> {
  const { client, error } = requireClient();
  if (!client) return { data: null, error };

  const { data, error: authError } = await client.auth.getUser();
  if (authError || !data.user) {
    return { data: null, error: "You must be signed in to do that." };
  }
  return { data: data.user.id, error: null };
}

// ── Validation ───────────────────────────────────────────────────────────────

const NICKNAME_RE = /^[a-z0-9_-]+$/;

/**
 * Normalises a nickname to its canonical stored form: trimmed + lowercased.
 * Returning a consistent case is what makes the case-insensitive unique index
 * predictable and lets us compare nicknames without surprises.
 */
export function normalizeNickname(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns an error string if the nickname is invalid, or null if it's fine. */
export function validateNickname(nickname: string): string | null {
  if (nickname.length < 3 || nickname.length > 30) {
    return "Nickname must be between 3 and 30 characters.";
  }
  if (!NICKNAME_RE.test(nickname)) {
    return "Nickname can only contain letters, numbers, underscores and dashes.";
  }
  return null;
}

/** Validate a file before upload. Mirrors the bucket's MIME + size limits. */
export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return "Avatar must be a PNG, JPEG, WebP or GIF image.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "Avatar must be 2 MB or smaller.";
  }
  return null;
}

/** Validate the original image before opening the crop editor. */
export function validateAvatarSourceFile(file: File): string | null {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return "Choose a PNG, JPEG, WebP or GIF image.";
  }
  if (file.size > MAX_AVATAR_SOURCE_BYTES) {
    return "Choose an image 8 MB or smaller.";
  }
  return null;
}

// Cleans the field set the user submits into a constraint-safe payload:
//   * trims strings, converts "" to null (so empty fields clear, not error),
//   * normalises nickname,
//   * leaves untouched any key the caller didn't provide.
function sanitizeInput(input: ProfileInput): { payload: Record<string, string | null>; error: string | null } {
  const payload: Record<string, string | null> = {};

  const cleanText = (v: string | null): string | null => {
    if (v === null) return null;
    const t = v.trim();
    return t === "" ? null : t;
  };

  if (input.full_name !== undefined) payload.full_name = cleanText(input.full_name);
  if (input.bio !== undefined) payload.bio = cleanText(input.bio);
  if (input.phone_number !== undefined) payload.phone_number = cleanText(input.phone_number);
  if (input.country !== undefined) payload.country = cleanText(input.country);
  if (input.city !== undefined) payload.city = cleanText(input.city);
  if (input.timezone !== undefined) payload.timezone = cleanText(input.timezone);

  if (input.nickname !== undefined) {
    const cleaned = cleanText(input.nickname);
    if (cleaned == null) {
      payload.nickname = null;
    } else {
      const normalized = normalizeNickname(cleaned);
      const nickErr = validateNickname(normalized);
      if (nickErr) return { payload, error: nickErr };
      payload.nickname = normalized;
    }
  }

  return { payload, error: null };
}

// Maps known Supabase/Postgres errors to user-friendly copy. Anything unknown
// is logged for developers (dev only) and shown as a generic message so we never
// leak raw database internals to end users.
function friendlyDbError(error: { message?: string; code?: string }, fallback: string): string {
  const msg = error.message ?? "";
  // 23505 = unique_violation → the only unique index here is the nickname one.
  if (error.code === "23505" || /duplicate key|unique/i.test(msg)) {
    return "That nickname is already taken. Please choose another.";
  }
  // 23514 = check_violation → a field exceeded its allowed length/format.
  if (error.code === "23514" || /violates check constraint/i.test(msg)) {
    return "One of your details didn't meet the required format. Please review and try again.";
  }
  if (import.meta.env.DEV) console.error("[profile] db error:", error);
  return fallback;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Fetch the current user's profile row. Upserts a safe row if none exists. */
export async function getCurrentProfile(): Promise<Result<Profile>> {
  const idResult = await requireUserId();
  if (idResult.error) return { data: null, error: idResult.error };
  const userId = idResult.data;
  const client = supabase!;

  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { data: null, error: friendlyDbError(error, "Couldn't load your profile. Please try again.") };
  }

  // Self-healing: if the row is somehow missing (the 0001 trigger should have
  // created it), create a minimal one so the page always has something to edit.
  if (!data) {
    const { data: created, error: insertError } = await client
      .from("profiles")
      .insert({ id: userId })
      .select(PROFILE_COLUMNS)
      .single();
    if (insertError) {
      return { data: null, error: friendlyDbError(insertError, "Couldn't initialise your profile.") };
    }
    return { data: created as Profile, error: null };
  }

  return { data: data as Profile, error: null };
}

/** Update the current user's editable profile fields. */
export async function updateCurrentProfile(input: ProfileInput): Promise<Result<Profile>> {
  const idResult = await requireUserId();
  if (idResult.error) return { data: null, error: idResult.error };
  const userId = idResult.data;
  const client = supabase!;

  const { payload, error: validationError } = sanitizeInput(input);
  if (validationError) return { data: null, error: validationError };

  const { data, error } = await client
    .from("profiles")
    .update(payload)
    .eq("id", userId) // belt-and-braces; RLS already restricts to own row
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    return { data: null, error: friendlyDbError(error, "Couldn't save your changes. Please try again.") };
  }
  return { data: data as Profile, error: null };
}

/**
 * Upload a new avatar to the private bucket and point the profile at it.
 * Removes the previous uploaded file (if any) so we don't accumulate orphans.
 */
export async function uploadAvatar(file: File): Promise<Result<Profile>> {
  const idResult = await requireUserId();
  if (idResult.error) return { data: null, error: idResult.error };
  const userId = idResult.data;
  const client = supabase!;

  const fileError = validateAvatarFile(file);
  if (fileError) return { data: null, error: fileError };

  // Read the existing path first so we can clean it up after a successful swap.
  const { data: existing } = await client
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();
  const previousPath = existing?.avatar_path ?? null;

  // Path: <user_id>/avatar/<timestamp>-<safeFileName> — first segment is the
  // RLS ownership boundary. Sanitise the name to avoid odd characters/paths.
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60) || "avatar";
  const fileName = `${Date.now()}-${safeName}${ext ? `.${ext.toLowerCase()}` : ""}`;
  const path = `${userId}/avatar/${fileName}`;

  const { error: uploadError } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    if (import.meta.env.DEV) console.error("[profile] avatar upload failed:", uploadError);
    return { data: null, error: "Couldn't upload your avatar. Please try again." };
  }

  // Point the profile at the new object.
  const { data: updated, error: updateError } = await client
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (updateError) {
    // Roll back the just-uploaded object so storage doesn't drift from the DB.
    await client.storage.from(AVATAR_BUCKET).remove([path]);
    return { data: null, error: friendlyDbError(updateError, "Couldn't save your new avatar.") };
  }

  // Best-effort cleanup of the previous file; failure here is non-fatal.
  if (previousPath && previousPath !== path) {
    await client.storage.from(AVATAR_BUCKET).remove([previousPath]);
  }

  return { data: updated as Profile, error: null };
}

/** Remove the uploaded avatar (deletes the object, clears avatar_path). */
export async function removeAvatar(): Promise<Result<Profile>> {
  const idResult = await requireUserId();
  if (idResult.error) return { data: null, error: idResult.error };
  const userId = idResult.data;
  const client = supabase!;

  const { data: existing } = await client
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();
  const path = existing?.avatar_path ?? null;

  if (path) {
    // Non-fatal if the object is already gone; we still clear the DB pointer.
    await client.storage.from(AVATAR_BUCKET).remove([path]);
  }

  const { data: updated, error } = await client
    .from("profiles")
    .update({ avatar_path: null })
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) {
    return { data: null, error: friendlyDbError(error, "Couldn't remove your avatar.") };
  }
  return { data: updated as Profile, error: null };
}

/**
 * Resolve the URL to display for a profile, applying the priority:
 *   uploaded avatar_path (signed URL) → external avatar_url → null (UI shows
 *   initials). Never throws; falls back gracefully on any storage error.
 */
export async function getAvatarDisplayUrl(profile: Pick<Profile, "avatar_path" | "avatar_url">): Promise<string | null> {
  if (profile.avatar_path && isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(profile.avatar_path, SIGNED_URL_TTL);
    if (!error && data?.signedUrl) return data.signedUrl;
    if (import.meta.env.DEV) console.warn("[profile] signed URL failed, falling back:", error);
  }
  return profile.avatar_url ?? null;
}
