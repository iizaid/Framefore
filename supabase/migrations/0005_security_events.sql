-- =============================================================================
-- 0005 — Security Events (Optional Audit Log)
-- =============================================================================
-- Purpose: An append-only audit table for auth and data events.
--          Examples: user_login, password_changed, mfa_enrolled,
--                    local_migration_started, local_migration_completed.
--
-- This table is optional for MVP. It is listed here so the schema is decided
-- before Phase 4.4+ wires cloud sync (migration events will be logged here).
--
-- Client policy: INSERT own + SELECT own only. No UPDATE or DELETE from the
-- client — the table is append-only from the frontend. Edge Functions or
-- server-side code may write rows with elevated privileges.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL if the user account was deleted after the event was recorded.
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text        NOT NULL,
  -- Arbitrary metadata: { projectId, sceneCount, error, provider, ... }
  -- Never log passwords, tokens, or full credentials here.
  metadata    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- No updated_at: rows are immutable once written.

  -- Bound the event_type vocabulary length and force metadata to be an object
  -- (never an array/scalar) so the audit log can't be stuffed with huge blobs.
  CONSTRAINT security_events_type_len   CHECK (char_length(event_type) BETWEEN 1 AND 100),
  CONSTRAINT security_events_meta_object CHECK (jsonb_typeof(metadata) = 'object')
);

-- Fast "recent events for this user" query.
CREATE INDEX IF NOT EXISTS security_events_user_created_idx
  ON public.security_events(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS — append-only from the client
-- ---------------------------------------------------------------------------
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_insert_own" ON public.security_events;
CREATE POLICY "events_insert_own" ON public.security_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "events_select_own" ON public.security_events;
CREATE POLICY "events_select_own" ON public.security_events
  FOR SELECT USING (auth.uid() = user_id);

-- No UPDATE or DELETE policies: rows are immutable from the client.
-- Edge Functions or Supabase service-role may purge old rows server-side
-- as needed, but that is a server-only operation.
