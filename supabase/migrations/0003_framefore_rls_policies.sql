-- =============================================================================
-- 0003 — Row Level Security Policies
-- =============================================================================
-- Purpose: Enables RLS on every user-owned table and creates per-command
--          policies. The anon key is public; RLS is the real security boundary.
--
-- Pattern used throughout:
--   SELECT  → USING  (auth.uid() = user_id)
--   INSERT  → WITH CHECK (auth.uid() = user_id)  [not USING — does nothing on INSERT]
--   UPDATE  → USING + WITH CHECK  (prevents both reading and writing wrong rows)
--   DELETE  → USING  (auth.uid() = user_id)
--
-- Child tables (scenes, canvas_*, scene_links, scene_assets) also check that
-- the parent project belongs to the same user on INSERT — defense-in-depth
-- against a forged project_id even when user_id passes.
--
-- Idempotent: every policy is dropped with IF EXISTS before re-creation.
--             (Postgres has no "CREATE POLICY IF NOT EXISTS".)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- No INSERT policy: the handle_new_user() SECURITY DEFINER trigger creates
-- the row. Granting a public insert policy would allow users to forge profiles.

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_own" ON public.user_settings;
CREATE POLICY "settings_select_own" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings_insert_own" ON public.user_settings;
CREATE POLICY "settings_insert_own" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings_update_own" ON public.user_settings;
CREATE POLICY "settings_update_own" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- No DELETE policy: user_settings lifecycle is tied to the auth user via CASCADE.

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
CREATE POLICY "projects_select_own" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
CREATE POLICY "projects_update_own" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
CREATE POLICY "projects_delete_own" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- scenes
-- ---------------------------------------------------------------------------
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scenes_select_own" ON public.scenes;
CREATE POLICY "scenes_select_own" ON public.scenes
  FOR SELECT USING (auth.uid() = user_id);

-- Strict insert: verify user_id AND that the parent project is also owned by
-- this user. Prevents a forged project_id from sneaking scenes into another
-- user's project even if user_id passes the simple check.
DROP POLICY IF EXISTS "scenes_insert_own" ON public.scenes;
CREATE POLICY "scenes_insert_own" ON public.scenes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "scenes_update_own" ON public.scenes;
CREATE POLICY "scenes_update_own" ON public.scenes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scenes_delete_own" ON public.scenes;
CREATE POLICY "scenes_delete_own" ON public.scenes
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- scene_links
-- ---------------------------------------------------------------------------
ALTER TABLE public.scene_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scene_links_select_own" ON public.scene_links;
CREATE POLICY "scene_links_select_own" ON public.scene_links
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scene_links_insert_own" ON public.scene_links;
CREATE POLICY "scene_links_insert_own" ON public.scene_links
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "scene_links_update_own" ON public.scene_links;
CREATE POLICY "scene_links_update_own" ON public.scene_links
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scene_links_delete_own" ON public.scene_links;
CREATE POLICY "scene_links_delete_own" ON public.scene_links
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- canvas_notes
-- ---------------------------------------------------------------------------
ALTER TABLE public.canvas_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canvas_notes_select_own" ON public.canvas_notes;
CREATE POLICY "canvas_notes_select_own" ON public.canvas_notes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "canvas_notes_insert_own" ON public.canvas_notes;
CREATE POLICY "canvas_notes_insert_own" ON public.canvas_notes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "canvas_notes_update_own" ON public.canvas_notes;
CREATE POLICY "canvas_notes_update_own" ON public.canvas_notes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "canvas_notes_delete_own" ON public.canvas_notes;
CREATE POLICY "canvas_notes_delete_own" ON public.canvas_notes
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- canvas_sections
-- ---------------------------------------------------------------------------
ALTER TABLE public.canvas_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canvas_sections_select_own" ON public.canvas_sections;
CREATE POLICY "canvas_sections_select_own" ON public.canvas_sections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "canvas_sections_insert_own" ON public.canvas_sections;
CREATE POLICY "canvas_sections_insert_own" ON public.canvas_sections
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "canvas_sections_update_own" ON public.canvas_sections;
CREATE POLICY "canvas_sections_update_own" ON public.canvas_sections
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "canvas_sections_delete_own" ON public.canvas_sections;
CREATE POLICY "canvas_sections_delete_own" ON public.canvas_sections
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- canvas_links
-- ---------------------------------------------------------------------------
ALTER TABLE public.canvas_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canvas_links_select_own" ON public.canvas_links;
CREATE POLICY "canvas_links_select_own" ON public.canvas_links
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "canvas_links_insert_own" ON public.canvas_links;
CREATE POLICY "canvas_links_insert_own" ON public.canvas_links
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "canvas_links_update_own" ON public.canvas_links;
CREATE POLICY "canvas_links_update_own" ON public.canvas_links
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "canvas_links_delete_own" ON public.canvas_links;
CREATE POLICY "canvas_links_delete_own" ON public.canvas_links
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- scene_assets
-- ---------------------------------------------------------------------------
ALTER TABLE public.scene_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scene_assets_select_own" ON public.scene_assets;
CREATE POLICY "scene_assets_select_own" ON public.scene_assets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scene_assets_insert_own" ON public.scene_assets;
CREATE POLICY "scene_assets_insert_own" ON public.scene_assets
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "scene_assets_update_own" ON public.scene_assets;
CREATE POLICY "scene_assets_update_own" ON public.scene_assets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scene_assets_delete_own" ON public.scene_assets;
CREATE POLICY "scene_assets_delete_own" ON public.scene_assets
  FOR DELETE USING (auth.uid() = user_id);
