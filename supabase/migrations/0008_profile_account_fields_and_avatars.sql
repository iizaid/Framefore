-- =============================================================================
-- 0008 — Profile / Account Fields + Private Avatars Bucket
-- =============================================================================
-- Purpose: Extends public.profiles with the editable account fields the Profile
--          page (Phase 4.4) writes to, and declares the private `avatars`
--          Storage bucket plus its RLS policies for user-uploaded avatar images.
--
-- SAFE FOR A LIVE DATABASE that already has 0001–0007 applied:
--   * Every column add uses ADD COLUMN IF NOT EXISTS.
--   * Constraints are added defensively (dropped-if-exists, then re-created)
--     so re-running never errors.
--   * Bucket insert uses ON CONFLICT DO NOTHING.
--   * Policies are DROP POLICY IF EXISTS before CREATE.
-- Do NOT edit 0001–0007. This migration is additive only.
--
-- AVATAR STRATEGY (read before touching the frontend):
--   * avatar_path  — the PRIVATE storage object path of an uploaded avatar,
--                    e.g. '<user_id>/avatar/1718000000000-photo.jpg'. It is NOT
--                    a URL. The frontend calls supabase.storage.from('avatars')
--                    .createSignedUrl(avatar_path, ttl) to display it.
--   * avatar_url   — the EXTERNAL fallback (e.g. a Google OAuth profile picture).
--                    Populated by handle_new_user() from raw_user_meta_data and
--                    kept as a fallback. Lives in 0001; unchanged here.
--   * PRIORITY: an uploaded avatar_path always takes priority over the external
--     avatar_url. If avatar_path is null (or its signed URL fails), the UI falls
--     back to avatar_url, and finally to rendered initials.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. New profile columns
-- ---------------------------------------------------------------------------
-- All nullable (except profile_completed which defaults false) so existing rows
-- and OAuth users without these details are never broken.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname          text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number      text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country           text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city              text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone          text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio               text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path       text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.avatar_path IS
  'Private storage object path of the uploaded avatar in the `avatars` bucket. '
  'Display via createSignedUrl(). Takes priority over external avatar_url.';
COMMENT ON COLUMN public.profiles.avatar_url IS
  'External avatar fallback (e.g. OAuth provider picture). Used only when '
  'avatar_path is null or its signed URL cannot be produced.';

-- ---------------------------------------------------------------------------
-- 2. Constraints (production-safe payload guards)
-- ---------------------------------------------------------------------------
-- Added via DROP ... IF EXISTS + ADD so the migration is idempotent. All guards
-- allow NULL so none of the new fields are required (OAuth users stay valid).

-- nickname: 3–30 chars, only letters / numbers / underscore / dash.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_nickname_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_nickname_len
  CHECK (nickname IS NULL OR char_length(nickname) BETWEEN 3 AND 30);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_nickname_chars;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_nickname_chars
  CHECK (nickname IS NULL OR nickname ~ '^[A-Za-z0-9_-]+$');

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_phone_len
  CHECK (phone_number IS NULL OR char_length(phone_number) <= 32);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_country_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_country_len
  CHECK (country IS NULL OR char_length(country) <= 80);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_city_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_city_len
  CHECK (city IS NULL OR char_length(city) <= 100);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_timezone_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_timezone_len
  CHECK (timezone IS NULL OR char_length(timezone) <= 80);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_bio_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_bio_len
  CHECK (bio IS NULL OR char_length(bio) <= 500);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_path_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_avatar_path_len
  CHECK (avatar_path IS NULL OR char_length(avatar_path) <= 512);

-- Case-insensitive uniqueness for nickname (only over non-null values). The
-- frontend trims and lowercases for comparison; this index is the hard guard.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_unique_ci
  ON public.profiles (lower(nickname))
  WHERE nickname IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Self-insert policy for profiles (upsert fallback)
-- ---------------------------------------------------------------------------
-- 0003 deliberately ships profiles with SELECT + UPDATE policies but NO INSERT
-- policy (the handle_new_user trigger creates the row). The Profile page needs a
-- safety-net upsert in case a row is ever missing, so we add a narrow INSERT
-- policy: a user may only insert their OWN row (id = auth.uid()). This cannot be
-- used to forge another user's profile, and roles do not live on profiles, so it
-- cannot escalate privileges. Matches the encapsulation note in 0003/0006.
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 4. Private `avatars` bucket
-- ---------------------------------------------------------------------------
-- PRIVATE bucket — display only via short-lived signed URLs. 2 MB limit. SVG is
-- intentionally excluded (it can carry script vectors and must never be rendered
-- as an inline image). If `storage.buckets` is not writable via SQL on your
-- Supabase version, create it manually instead:
--   Dashboard → Storage → New bucket
--   Name: avatars | Public: OFF | File size limit: 2097152 (2 MB)
--   Allowed MIME types: image/png, image/jpeg, image/webp, image/gif
-- then skip this INSERT and run only the policy block below.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false,                          -- PRIVATE — never expose contents publicly
  2097152,                        -- 2 MB per file
  ARRAY['image/png','image/jpeg','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Storage RLS policies on storage.objects for the `avatars` bucket
-- ---------------------------------------------------------------------------
-- Path convention: <user_id>/avatar/<fileName.ext>
-- The FIRST path segment is always auth.uid()::text and is the ownership
-- boundary. A user can only read/write/delete objects under their own folder.

-- Read own avatars (display via signed URL).
DROP POLICY IF EXISTS "avatars_select_own" ON storage.objects;
CREATE POLICY "avatars_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Upload own avatars.
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update own avatars (covers metadata changes and rename/move; WITH CHECK gates
-- the destination so an object can never be moved into another user's folder).
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete own avatars (called on "remove avatar" and when replacing an old file).
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- Design notes
-- =============================================================================
-- * SVG excluded by allowed_mime_types: SVG can embed script and must not be
--   rendered as an inline <img>. Keep the bucket to raster formats only.
-- * Bucket stays PRIVATE. Always display avatars via createSignedUrl(); never
--   make the bucket public and never embed the service-role key in the client.
-- * avatar_path is the uploaded source of truth; avatar_url is the external
--   (OAuth) fallback. Frontend priority: avatar_path → avatar_url → initials.
-- * profile_completed is a simple flag the app can flip once a user fills in the
--   core fields; it is never required and defaults to false for existing rows.
-- =============================================================================
