-- =============================================================================
-- RLS Manual Verification Checks
-- =============================================================================
-- PURPOSE: Run these queries in Supabase SQL Editor to verify that Row Level
--          Security is working correctly. These are READ-ONLY or advisory
--          checks. Do not run the "simulate" blocks in production with real
--          user data.
--
-- HOW TO USE:
--   1. Apply migrations 0001–0005 to your Supabase project.
--   2. Create two test users via Dashboard → Authentication → Users:
--        User A: tester-a@example.com
--        User B: tester-b@example.com
--   3. Sign in as each user via your app or Supabase Auth REST API to get JWTs.
--   4. Run each check block below in the SQL Editor.
--      For checks that require a specific user context, use set_config() as shown.
--
-- NOTE: The SQL Editor runs as the service-role (superuser) by default, which
--       bypasses RLS. To test RLS you must either:
--         a) Use set_config('request.jwt.claims', ...) to simulate a user, OR
--         b) Test via your app's client with a real signed-in session, OR
--         c) Use Supabase's built-in "Table Editor → RLS Policies → Test" UI.
--   Option (b) is the most reliable for production verification.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- CHECK 1: RLS is enabled on every user-owned table
-- ---------------------------------------------------------------------------
-- Expected: rowsecurity = true for all listed tables.

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'user_settings', 'projects', 'scenes',
    'scene_links', 'canvas_notes', 'canvas_sections',
    'canvas_links', 'scene_assets', 'security_events',
    'user_roles', 'admin_audit_events', 'rate_limit_events'
  )
ORDER BY tablename;


-- ---------------------------------------------------------------------------
-- CHECK 2: Policy names and commands are as expected
-- ---------------------------------------------------------------------------
-- Expected: each table has separate SELECT, INSERT, UPDATE, DELETE policies.

SELECT
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;


-- ---------------------------------------------------------------------------
-- CHECK 3: Trigger functions exist
-- ---------------------------------------------------------------------------

SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('set_updated_at', 'handle_new_user')
ORDER BY routine_name;


-- ---------------------------------------------------------------------------
-- CHECK 4: handle_new_user trigger is attached to auth.users
-- ---------------------------------------------------------------------------

SELECT
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';


-- ---------------------------------------------------------------------------
-- CHECK 5: updated_at triggers are attached to all tables
-- ---------------------------------------------------------------------------

SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'set_%_updated_at'
ORDER BY event_object_table;


-- ---------------------------------------------------------------------------
-- CHECK 6: scenes.order_index exists and is NOT NULL
-- ---------------------------------------------------------------------------
-- This column enforces the golden rule (video order). Must never be nullable.

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'scenes'
  AND column_name = 'order_index';
-- Expected: is_nullable = 'NO'


-- ---------------------------------------------------------------------------
-- CHECK 7: Reference-images bucket exists and is private
-- ---------------------------------------------------------------------------

SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'reference-images';
-- Expected: public = false, file_size_limit = 10485760


-- ---------------------------------------------------------------------------
-- CHECK 8: Storage policies exist on storage.objects
-- ---------------------------------------------------------------------------

SELECT
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename  = 'objects'
  AND policyname LIKE 'ri_%'
ORDER BY cmd;
-- Expected: ri_delete_own, ri_insert_own, ri_select_own, ri_update_own


-- ---------------------------------------------------------------------------
-- CHECK 9: Composite tenant-integrity constraints exist (structural isolation)
-- ---------------------------------------------------------------------------
-- These FKs/uniques make cross-tenant links physically unstorable even under
-- the service role. Expect all of them present.

SELECT conname, contype, conrelid::regclass AS on_table
FROM pg_constraint
WHERE conname IN (
  'projects_id_user_uniq',
  'scenes_id_project_user_uniq', 'scenes_project_user_fk',
  'scene_links_from_scene_fk', 'scene_links_to_scene_fk', 'scene_links_project_user_fk',
  'scene_assets_scene_fk', 'scene_assets_project_user_fk',
  'canvas_notes_project_user_fk', 'canvas_sections_project_user_fk',
  'canvas_links_project_user_fk'
)
ORDER BY on_table, conname;
-- contype: 'u' = unique, 'f' = foreign key.


-- ---------------------------------------------------------------------------
-- CHECK 10: Admin role functions exist and are SECURITY DEFINER
-- ---------------------------------------------------------------------------

SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('has_app_role','is_admin','is_owner','grant_app_role','revoke_app_role')
ORDER BY routine_name;
-- Expected: all present, security_type = 'DEFINER'.


-- ---------------------------------------------------------------------------
-- CHECK 11: user_roles / rate_limit_events have NO client write policies
-- ---------------------------------------------------------------------------
-- Expected for user_roles: exactly one SELECT policy, no INSERT/UPDATE/DELETE.
-- Expected for rate_limit_events: ZERO policies (service-role only).

SELECT tablename, cmd, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_roles', 'admin_audit_events', 'rate_limit_events')
ORDER BY tablename, cmd;


-- ---------------------------------------------------------------------------
-- CHECK 12: scene_assets MIME/size guards exist
-- ---------------------------------------------------------------------------

SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.scene_assets'::regclass
  AND contype = 'c'
ORDER BY conname;
-- Expect scene_assets_mime_image (excludes image/svg+xml) and
-- scene_assets_size_range (<= 10485760).


-- ---------------------------------------------------------------------------
-- SIMULATE: Cross-user isolation (run in SQL Editor with set_config)
-- ---------------------------------------------------------------------------
-- Replace USER_A_ID and USER_B_ID with real UUIDs from auth.users.
-- Replace PROJECT_A_ID with a project owned by User A.
--
-- This block shows how to impersonate User B in SQL and confirm that User A's
-- data is not visible. In practice, testing via the app with a signed-in User B
-- session is more reliable than set_config simulation.

/*

-- Step 1: Insert a test project as User A (run as service-role or via app)
-- INSERT INTO public.projects (user_id, title)
-- VALUES ('<USER_A_ID>', 'User A test project');

-- Step 2: Simulate User B reading projects — should return 0 rows for A's data
-- BEGIN;
-- SELECT set_config('request.jwt.claims',
--   '{"sub": "<USER_B_ID>", "role": "authenticated"}', true);
-- SET LOCAL role TO authenticated;
-- SELECT * FROM public.projects WHERE id = '<PROJECT_A_ID>';
-- Expected: 0 rows (RLS blocks User B)
-- ROLLBACK;

-- Step 3: Simulate User B inserting a scene with User A's project_id
-- BEGIN;
-- SELECT set_config('request.jwt.claims',
--   '{"sub": "<USER_B_ID>", "role": "authenticated"}', true);
-- SET LOCAL role TO authenticated;
-- INSERT INTO public.scenes (project_id, user_id, order_index, title)
-- VALUES ('<PROJECT_A_ID>', '<USER_B_ID>', 0, 'Forged scene');
-- Expected: ERROR — the parent-project EXISTS check in scenes_insert_own blocks it
-- ROLLBACK;

-- Step 4: Simulate User B inserting a scene with a forged user_id (User A's id)
-- BEGIN;
-- SELECT set_config('request.jwt.claims',
--   '{"sub": "<USER_B_ID>", "role": "authenticated"}', true);
-- SET LOCAL role TO authenticated;
-- INSERT INTO public.scenes (project_id, user_id, order_index, title)
-- VALUES ('<PROJECT_A_ID>', '<USER_A_ID>', 0, 'Forged ownership');
-- Expected: ERROR — WITH CHECK (auth.uid() = user_id) fails because
--           auth.uid() = B but user_id = A
-- ROLLBACK;

*/


-- ---------------------------------------------------------------------------
-- ATTACK SIMULATIONS (expanded) — run each inside BEGIN; ... ROLLBACK;
-- ---------------------------------------------------------------------------
-- Each block impersonates User B and attempts a malicious write against User A's
-- data. Replace <USER_A_ID>, <USER_B_ID>, <PROJECT_A_ID>, <SCENE_A_ID>,
-- <PROJECT_B_ID>, <SCENE_B_ID> with real UUIDs. EVERY block must ERROR (or
-- affect 0 rows). If any block SUCCEEDS in touching User A's data, RLS/FKs are
-- misconfigured — stop and fix before launch.
--
-- Helper to impersonate inside a transaction:
--   SELECT set_config('request.jwt.claims',
--     json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
--   SET LOCAL role TO authenticated;

/*

-- A1. User B reads User A's project  → expect 0 rows
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  SELECT count(*) FROM public.projects WHERE id = '<PROJECT_A_ID>';   -- expect 0
ROLLBACK;

-- A2. User B updates User A's project  → expect 0 rows affected
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  UPDATE public.projects SET title = 'hijacked' WHERE id = '<PROJECT_A_ID>';  -- 0 rows
ROLLBACK;

-- A3. User B deletes User A's project  → expect 0 rows affected
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  DELETE FROM public.projects WHERE id = '<PROJECT_A_ID>';  -- 0 rows
ROLLBACK;

-- A4. User B inserts a scene into User A's project  → expect ERROR (RLS)
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  INSERT INTO public.scenes (project_id, user_id, order_index, title)
  VALUES ('<PROJECT_A_ID>', '<USER_B_ID>', 0, 'forged');  -- ERROR
ROLLBACK;

-- A5. User B forges user_id = User A on their own insert  → expect ERROR
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  INSERT INTO public.scenes (project_id, user_id, order_index, title)
  VALUES ('<PROJECT_B_ID>', '<USER_A_ID>', 0, 'forged owner');  -- ERROR (with check)
ROLLBACK;

-- A6. User B moves their OWN scene into User A's project  → expect ERROR
--     (scenes_update_own WITH CHECK + composite FK both block it)
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  UPDATE public.scenes SET project_id = '<PROJECT_A_ID>' WHERE id = '<SCENE_B_ID>';  -- ERROR
ROLLBACK;

-- A7. User B creates a scene_link pointing at User A's scene  → expect ERROR
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  INSERT INTO public.scene_links (project_id, user_id, from_scene_id, to_scene_id)
  VALUES ('<PROJECT_B_ID>', '<USER_B_ID>', '<SCENE_B_ID>', '<SCENE_A_ID>');  -- ERROR
ROLLBACK;

-- A8. User B updates a link's to_scene_id to User A's scene  → expect ERROR
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  UPDATE public.scene_links SET to_scene_id = '<SCENE_A_ID>'
  WHERE project_id = '<PROJECT_B_ID>' AND user_id = '<USER_B_ID>';  -- ERROR
ROLLBACK;

-- A9. User B attaches an asset to User A's scene  → expect ERROR
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  INSERT INTO public.scene_assets (scene_id, project_id, user_id, storage_path, mime_type, size_bytes)
  VALUES ('<SCENE_A_ID>', '<PROJECT_B_ID>', '<USER_B_ID>', 'p/x.png', 'image/png', 10);  -- ERROR
ROLLBACK;

-- A10. SVG asset (should be rejected by CHECK)  → expect ERROR
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  INSERT INTO public.scene_assets (scene_id, project_id, user_id, storage_path, mime_type, size_bytes)
  VALUES ('<SCENE_B_ID>', '<PROJECT_B_ID>', '<USER_B_ID>', 'p/x.svg', 'image/svg+xml', 10);  -- ERROR
ROLLBACK;

-- A11. Privilege escalation: User B grants themselves admin  → expect ERROR / 0 rows
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  -- direct insert: denied (no INSERT policy on user_roles)
  INSERT INTO public.user_roles (user_id, role) VALUES ('<USER_B_ID>', 'admin');  -- ERROR
ROLLBACK;

BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  -- function path: rejected because caller is not owner/admin
  SELECT public.grant_app_role('<USER_B_ID>', 'admin');  -- ERROR: only an owner may grant admin
ROLLBACK;

-- A12. Non-admin reads admin audit log  → expect 0 rows
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  SELECT count(*) FROM public.admin_audit_events;  -- expect 0 (is_admin() = false)
ROLLBACK;

-- A13. Non-admin reads global rate-limit data  → expect 0 rows (RLS, no policy)
BEGIN;
  SELECT set_config('request.jwt.claims', json_build_object('sub','<USER_B_ID>','role','authenticated')::text, true);
  SET LOCAL role TO authenticated;
  SELECT count(*) FROM public.rate_limit_events;  -- expect 0
ROLLBACK;

-- A14. Storage path spoofing: User B uploads under User A's folder  → expect ERROR
--     (storage policy: segment[1] must equal auth.uid()). Test via the app/API,
--     but the policy predicate is:
--       (storage.foldername(name))[1] = auth.uid()::text
--     so name='<USER_A_ID>/<PROJECT_A_ID>/s/x.png' as User B fails the WITH CHECK.

*/


-- ---------------------------------------------------------------------------
-- VERIFY: order_index is the timeline, canvas does NOT affect it
-- ---------------------------------------------------------------------------
-- Updating a scene's canvas layout must not change its order_index. Run as the
-- owner (via app or set_config). Expect order_index identical before/after.

/*
-- before
SELECT id, order_index, layout FROM public.scenes WHERE id = '<SCENE_ID>';
-- move the card on the canvas (visual only)
UPDATE public.scenes SET layout = '{"x": 9999, "y": 1234}'::jsonb WHERE id = '<SCENE_ID>';
-- after — order_index unchanged
SELECT id, order_index, layout FROM public.scenes WHERE id = '<SCENE_ID>';
*/


-- ---------------------------------------------------------------------------
-- VERIFY: Export query returns scenes in order_index order (golden rule)
-- ---------------------------------------------------------------------------
-- Replace PROJECT_ID with a real project that has multiple scenes.
-- The result must be ordered by order_index, NOT by id or created_at.

/*

SELECT
  order_index,
  id,
  title,
  duration_sec
FROM public.scenes
WHERE project_id = '<PROJECT_ID>'
ORDER BY order_index ASC;

-- Confirm:
--   Row 0 = first scene in the video
--   Row 1 = second scene
--   ...
-- layout (x,y) should be irrelevant to this ordering.

*/
