-- =============================================================================
-- 0001 — Profiles, User Settings, and Auth Helpers
-- =============================================================================
-- Purpose: Creates the per-user profile and settings rows that mirror a Supabase
--          auth.users entry. A trigger fires on every new signup (email/password
--          and OAuth) and inserts both rows automatically so the app never needs
--          to create them manually.
--
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS and CREATE OR REPLACE for
-- functions. Run this before 0002 (core tables depend on user rows existing).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. updated_at trigger helper
-- ---------------------------------------------------------------------------
-- A single reusable trigger function that stamps updated_at to now() before
-- every UPDATE. Called by triggers on every table that has an updated_at column.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
-- Explicit search_path prevents search-path injection attacks on SECURITY
-- DEFINER functions (Postgres security best-practice).
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Profiles table
-- ---------------------------------------------------------------------------
-- One row per auth.users entry. id mirrors auth.users.id so joins are free
-- (no extra FK column needed). ON DELETE CASCADE ensures the profile disappears
-- when the auth user is deleted, matching Supabase's recommended setup.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Nullable: OAuth providers may omit these; email/password signups have NULLs.
  full_name   text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  -- Payload guards. All allow NULL so OAuth users with no name/avatar are fine.
  CONSTRAINT profiles_full_name_len CHECK (full_name IS NULL OR char_length(full_name) <= 160),
  CONSTRAINT profiles_avatar_len    CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 2048),
  -- avatar_url, if present, must be an http(s) URL — blocks javascript:/data:/
  -- file: schemes that could be abused if ever rendered without sanitisation.
  CONSTRAINT profiles_avatar_scheme CHECK (
    avatar_url IS NULL
    OR avatar_url LIKE 'http://%'
    OR avatar_url LIKE 'https://%'
  )
);

-- Keep updated_at current on every update.
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. User settings table
-- ---------------------------------------------------------------------------
-- Per-user application settings: theme preference, migration state, etc.
-- user_id is the PK (one row per user, matched to auth.users.id).

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  has_migrated_local   boolean     NOT NULL DEFAULT false,
  preferred_theme      text        NOT NULL DEFAULT 'system',
  -- Open JSONB bag for future preferences (e.g., default models, last-opened
  -- project id) WITHOUT schema churn. It is intentionally future-safe but still
  -- bounded: the CHECK forces it to be a JSON OBJECT (never an array/scalar/huge
  -- string), so new keys can be added freely while the shape stays predictable.
  preferences          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  -- Constrain theme to the three values the app actually supports.
  CONSTRAINT user_settings_theme_ck      CHECK (preferred_theme IN ('system','light','dark')),
  CONSTRAINT user_settings_prefs_object  CHECK (jsonb_typeof(preferences) = 'object')
);

DROP TRIGGER IF EXISTS set_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. handle_new_user() — auto-create profile + settings on signup
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so it can insert into public.profiles without a public
-- insert policy (the trigger runs as the function owner, not the signing user).
-- SET search_path is required to prevent search-path hijacking on SECURITY
-- DEFINER functions.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  -- Sanitised copies of the provider metadata. We NEVER insert raw provider
  -- values directly: an OAuth provider could return an oversized full_name, an
  -- empty string, or a non-http(s) avatar_url, any of which would violate the
  -- profiles CHECK constraints and make the AFTER INSERT trigger fail — which
  -- would abort the entire signup. Normalising here keeps signup robust while
  -- the table constraints stay strict (defense in depth, not a weakening).
  safe_full_name  text;
  safe_avatar_url text;
BEGIN
  -- full_name: trim, treat '' as NULL, cap to the 160-char column limit.
  safe_full_name := nullif(trim(NEW.raw_user_meta_data ->> 'full_name'), '');
  IF safe_full_name IS NOT NULL THEN
    safe_full_name := left(safe_full_name, 160);
  END IF;

  -- avatar_url: trim, treat '' as NULL, cap to 2048, and keep ONLY if it is an
  -- http(s) URL — anything else (javascript:/data:/file:/relative) becomes NULL
  -- so it can never trip profiles_avatar_scheme. (We cap before the scheme check
  -- so the LIKE still inspects the real prefix of an over-long URL.)
  safe_avatar_url := nullif(trim(NEW.raw_user_meta_data ->> 'avatar_url'), '');
  IF safe_avatar_url IS NOT NULL THEN
    safe_avatar_url := left(safe_avatar_url, 2048);
    IF safe_avatar_url NOT LIKE 'http://%'
       AND safe_avatar_url NOT LIKE 'https://%' THEN
      safe_avatar_url := NULL;
    END IF;
  END IF;

  -- Create a profile row. OAuth providers populate raw_user_meta_data with
  -- full_name and avatar_url; email/password signups will have NULLs here. Both
  -- values are now NULL-tolerant and constraint-safe.
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    safe_full_name,
    safe_avatar_url
  )
  -- No-op if the row already exists (e.g., from a re-trigger or admin import).
  ON CONFLICT (id) DO NOTHING;

  -- Create a user_settings row with defaults.
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Fire the function whenever a new auth user is created (email + OAuth).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- RLS for profiles and user_settings is in 0003_framefore_rls_policies.sql.
-- =============================================================================
