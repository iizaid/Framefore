-- =============================================================================
-- 0004 — Reference Images Storage Bucket + Policies
-- =============================================================================
-- Purpose: Prepares the private `reference-images` Storage bucket and its RLS
--          policies. Binary image files are not uploaded in this phase — this
--          migration only declares the bucket and access rules so they're ready
--          when Phase 4.4+ wires the upload flow.
--
-- IMPORTANT — bucket creation via SQL:
--   The `INSERT INTO storage.buckets` approach works on self-hosted Supabase
--   and recent Supabase Cloud versions. If your project's Supabase version does
--   not expose `storage.buckets` via SQL, create the bucket manually instead:
--     Dashboard → Storage → New bucket
--     Name: reference-images
--     Public: OFF (private)
--     File size limit: 10485760 (10 MB)
--     Allowed MIME types: image/png, image/jpeg, image/webp, image/gif
--   Then skip the INSERT below and run only the policy block.
--
-- Storage path convention (drives RLS):
--   reference-images/{user_id}/{project_id}/{scene_id}/{uuid}.{ext}
--   The FIRST path segment is always auth.uid()::text; the SECOND is project_id.
--   The storage policies below authorize by path segment, and the two enforced
--   segments differ by command:
--     * SELECT / DELETE — gate on segment[1] (user_id) only. No project join, so
--       a user can always read/clean up their own objects, even orphans left
--       after a project row was deleted (Storage does not cascade).
--     * INSERT / UPDATE — gate on segment[1] (user_id) AND segment[2]
--       (project_id must be a project the caller owns). These are the paths that
--       set a destination, so this blocks placing or moving an object into
--       another user's folder or a project_id the caller doesn't own.
--
-- Signed URLs (not public): always generate signed URLs for display. Never
--   make this bucket public. See plan/15-storage-and-reference-images-plan.md.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Bucket declaration
-- ---------------------------------------------------------------------------
-- ON CONFLICT DO NOTHING makes this safe to re-run even if the bucket was
-- created via the dashboard already.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reference-images',
  'reference-images',
  false,                          -- PRIVATE — never expose contents publicly
  10485760,                       -- 10 MB per file
  ARRAY['image/png','image/jpeg','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Storage RLS policies on storage.objects
-- ---------------------------------------------------------------------------
-- storage.foldername(name) splits the object name on '/' and returns an array.
-- Index [1] is the first segment = user_id by path convention above.
-- Comparing it to auth.uid()::text ensures users can only touch their own files.

-- Read own files
DROP POLICY IF EXISTS "ri_select_own" ON storage.objects;
CREATE POLICY "ri_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reference-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Upload own files.
-- Path convention: {user_id}/{project_id}/{scene_id}/{uuid}.{ext}
-- Segment [1] must be the caller. Segment [2] (project_id) must be a project the
-- caller owns — this blocks a user from writing into their own folder but under
-- a project_id that isn't theirs (keeps Storage paths consistent with the DB).
-- Comparison is text = text (projects.id::text vs the path segment), so a
-- non-UUID segment simply fails to match (fails closed, no cast error).
DROP POLICY IF EXISTS "ri_insert_own" ON storage.objects;
CREATE POLICY "ri_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reference-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.user_id = auth.uid()
    )
  );

-- Allow updating metadata on own files (e.g., content-type correction) and,
-- importantly, gate object RENAME/MOVE. The Supabase client `move`/`copy` APIs
-- mutate storage.objects.name, so WITH CHECK applies to the DESTINATION path.
--   USING  (old row): segment[1] = caller — you can only act on your own folder,
--          and we deliberately do NOT require the project row to still exist, so
--          cleanup/relocation of objects from a just-deleted project keeps working.
--   WITH CHECK (new row): segment[1] = caller AND segment[2] is a project the
--          caller owns — you cannot move an object into another user's project
--          path (nor into a non-existent/foreign project_id). Matches INSERT.
DROP POLICY IF EXISTS "ri_update_own" ON storage.objects;
CREATE POLICY "ri_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'reference-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'reference-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.user_id = auth.uid()
    )
  );

-- Delete own files (called on scene/project delete; Storage objects don't
-- cascade automatically — the app must delete them explicitly).
DROP POLICY IF EXISTS "ri_delete_own" ON storage.objects;
CREATE POLICY "ri_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'reference-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- Design notes
-- =============================================================================
-- * SVG excluded: SVG can embed script vectors and must not be rendered as an
--   image. If SVG support is needed later, serve it as an attachment
--   (Content-Disposition: attachment) only. See plan/14-security-threat-model.md.
--
-- * Project-ownership (segment [2]) is validated on the WRITE paths that set a
--   destination path: INSERT (WITH CHECK) and UPDATE (WITH CHECK, covering
--   rename/move). SELECT and DELETE gate only on segment [1] = auth.uid() and
--   deliberately do NOT require the project row to still exist, so orphan cleanup
--   keeps working after a project is deleted (project delete cascades the DB rows
--   but Storage objects do not cascade — the app/an Edge Function must delete them
--   explicitly). Net effect: a user can never place or move an object into another
--   user's folder OR into a project_id they don't own, yet can still read/delete
--   their own leftover objects during cleanup.
--
-- * Strongest-possible enforcement (scene_id segment [3] ownership, atomic
--   project+scene+object lifecycle) is NOT expressible in a single Storage RLS
--   policy. Treat path validation here as the floor; route privileged/bulk
--   object operations through an Edge Function using the service role with
--   audit logging. See supabase/SECURITY_REVIEW.md ("Storage residual risks").
--
-- * Always serve via short-lived signed URLs (createSignedUrl). Never make this
--   bucket public. Never embed the service-role key in the client.
-- =============================================================================
