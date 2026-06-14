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
--   The FIRST path segment is always auth.uid()::text. The storage policies
--   below authorize based solely on this segment — no join needed.
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

-- Upload own files
DROP POLICY IF EXISTS "ri_insert_own" ON storage.objects;
CREATE POLICY "ri_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reference-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow updating metadata on own files (e.g., content-type correction).
DROP POLICY IF EXISTS "ri_update_own" ON storage.objects;
CREATE POLICY "ri_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'reference-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'reference-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
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
-- Note: SVG files are intentionally excluded from allowed_mime_types. SVG can
-- embed script vectors and must not be rendered as images. If SVG support is
-- needed later, serve as attachment (Content-Disposition: attachment) only.
-- See plan/14-security-threat-model.md.
-- =============================================================================
