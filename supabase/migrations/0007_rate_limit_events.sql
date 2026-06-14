-- =============================================================================
-- 0007 — Rate-Limit / Abuse Event Infrastructure (future Edge Functions)
-- =============================================================================
-- READ THIS FIRST — what this table is NOT:
--   This table does NOT and CANNOT rate-limit Supabase Auth login/signup.
--   Those requests hit Supabase's auth endpoints and never touch your tables,
--   so no RLS table or row count can throttle them. Auth throttling is
--   configured in the Supabase dashboard + a CAPTCHA/Turnstile + Cloudflare/WAF.
--   See supabase/RATE_LIMITING.md for the full boundary map.
--
-- What this table IS:
--   A counter/event store for FUTURE custom rate limits enforced inside Edge
--   Functions (e.g. "max N AI generations per user per hour", bulk export
--   throttling). An Edge Function (service role) records an event here and
--   counts recent rows for a (user_id|ip_hash, action) key to decide allow/deny.
--
-- Privacy: store ip_hash (a salted hash), NEVER a raw IP. No tokens, no secrets.
--
-- Safe to re-run: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Either user_id (authenticated actions) or ip_hash (pre-auth actions) keys
  -- the limit. Both nullable; at least one is expected per row.
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_hash     text        CHECK (ip_hash IS NULL OR char_length(ip_hash) <= 128),
  action      text        NOT NULL CHECK (char_length(action) BETWEEN 1 AND 100),
  metadata    jsonb       NOT NULL DEFAULT '{}'::jsonb
              CHECK (jsonb_typeof(metadata) = 'object'),
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Optional TTL marker so a scheduled job / Edge Function can purge old rows.
  expires_at  timestamptz
);

-- Count "recent events for this user + action" cheaply.
CREATE INDEX IF NOT EXISTS rate_limit_user_action_idx
  ON public.rate_limit_events(user_id, action, created_at DESC);

-- Count "recent events for this client IP + action" (pre-auth flows).
CREATE INDEX IF NOT EXISTS rate_limit_ip_action_idx
  ON public.rate_limit_events(ip_hash, action, created_at DESC);

-- Support TTL sweeps.
CREATE INDEX IF NOT EXISTS rate_limit_expires_idx
  ON public.rate_limit_events(expires_at)
  WHERE expires_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- RLS — service-role only (no client access at all)
-- ---------------------------------------------------------------------------
-- RLS is enabled with ZERO policies, so every anon/authenticated read and write
-- is denied. Only the service role (Edge Functions / server) bypasses RLS to
-- write events and read counts. Regular users must never read global rate-limit
-- data (it would leak other users' activity) and must never write it (they
-- could erase their own limit history).
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

-- (Intentionally no policies. Do not add a client policy here.)
