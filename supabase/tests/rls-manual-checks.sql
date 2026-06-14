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
    'canvas_links', 'scene_assets', 'security_events'
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
