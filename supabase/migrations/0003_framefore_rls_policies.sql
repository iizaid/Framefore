-- =============================================================================
-- 0003 — Row Level Security Policies
-- =============================================================================
-- Purpose: Enables RLS on every user-owned table and creates per-command
--          policies. The anon key is public; RLS is the real security boundary.
--
-- Defense-in-depth layering (this file is layer 2 of 3):
--   Layer 1 — composite FKs in 0002 make cross-tenant relationships physically
--             unstorable (apply even to the service role / buggy server code).
--   Layer 2 — RLS policies here scope every client statement to auth.uid().
--   Layer 3 — CHECK constraints in 0002 bound payload size/shape.
--
-- Pattern used throughout:
--   SELECT  → USING (auth.uid() = user_id)
--   INSERT  → WITH CHECK (ownership + parent/endpoint ownership)
--   UPDATE  → USING (current row owned)  +  WITH CHECK (NEW row still owned AND
--             still points only at this user's project/scenes). The WITH CHECK
--             is what stops "update my row to point at User B's project/scene".
--   DELETE  → USING (auth.uid() = user_id)
--
-- Idempotent: every policy is dropped with IF EXISTS before re-creation.
--             (Postgres has no "CREATE POLICY IF NOT EXISTS".)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- Admin/role columns intentionally do NOT live here, so a profile UPDATE can
-- never escalate privileges. Roles are a separate table (0006) with no client
-- write path. See supabase/ADMIN_MODEL.md.
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

-- WITH CHECK also enforces auth.uid() = user_id so a project can't be
-- "given away" by rewriting user_id on UPDATE.
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

-- Strict insert: verify user_id AND that the parent project is owned by this
-- user. Stops a forged project_id even if user_id passes.
DROP POLICY IF EXISTS "scenes_insert_own" ON public.scenes;
CREATE POLICY "scenes_insert_own" ON public.scenes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

-- HARDENED UPDATE: USING gates the current (old) row to the owner; WITH CHECK
-- re-validates the NEW row so a user cannot rewrite project_id to point at
-- another user's project, nor flip user_id. (Composite FK in 0002 also blocks
-- this — RLS makes the intent explicit and fails earlier with a clear error.)
DROP POLICY IF EXISTS "scenes_update_own" ON public.scenes;
CREATE POLICY "scenes_update_own" ON public.scenes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "scenes_delete_own" ON public.scenes;
CREATE POLICY "scenes_delete_own" ON public.scenes
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- scene_links  (both endpoints must belong to the same project + user)
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
    AND EXISTS (
      SELECT 1 FROM public.scenes s
      WHERE s.id = from_scene_id AND s.project_id = project_id AND s.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.scenes s
      WHERE s.id = to_scene_id AND s.project_id = project_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "scene_links_update_own" ON public.scene_links;
CREATE POLICY "scene_links_update_own" ON public.scene_links
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.scenes s
      WHERE s.id = from_scene_id AND s.project_id = project_id AND s.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.scenes s
      WHERE s.id = to_scene_id AND s.project_id = project_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "scene_links_delete_own" ON public.scene_links;
CREATE POLICY "scene_links_delete_own" ON public.scene_links
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- canvas_notes  (VISUAL ONLY — never affects export/order)
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
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "canvas_notes_delete_own" ON public.canvas_notes;
CREATE POLICY "canvas_notes_delete_own" ON public.canvas_notes
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- canvas_sections  (VISUAL ONLY)
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
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "canvas_sections_delete_own" ON public.canvas_sections;
CREATE POLICY "canvas_sections_delete_own" ON public.canvas_sections
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- canvas_links  (VISUAL ONLY)
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
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "canvas_links_delete_own" ON public.canvas_links;
CREATE POLICY "canvas_links_delete_own" ON public.canvas_links
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- scene_assets  (asset must belong to a scene in the user's own project)
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
    AND EXISTS (
      SELECT 1 FROM public.scenes s
      WHERE s.id = scene_id AND s.project_id = project_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "scene_assets_update_own" ON public.scene_assets;
CREATE POLICY "scene_assets_update_own" ON public.scene_assets
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.scenes s
      WHERE s.id = scene_id AND s.project_id = project_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "scene_assets_delete_own" ON public.scene_assets;
CREATE POLICY "scene_assets_delete_own" ON public.scene_assets
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- NOTE on the EXISTS subqueries above: they reference public.projects /
-- public.scenes, which themselves have RLS enabled. Policy subqueries run with
-- the same caller identity, so they only "see" rows the caller owns — the
-- checks are correct and cannot be tricked into matching another user's rows.
-- The composite FKs in 0002 are the structural backstop if a policy is ever
-- mis-edited.
-- =============================================================================
