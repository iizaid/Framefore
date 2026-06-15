-- =============================================================================
-- 0012 — Admin Chart Series Aggregation
-- =============================================================================
-- Purpose: Provide aggregate time-series data for admin dashboard charts.
--          Returns daily counts for users, profiles, audit events, security events,
--          and rate limit events over a strict bounded period.
--
-- Security: SECURITY DEFINER, restricted to admins. Returns only aggregate integers.
--           No user data, paths, emails, or text is returned.
-- =============================================================================

-- 1. Add safe public-table indexes for fast date aggregations
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_events_created_at_idx ON public.admin_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_created_at_idx ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS rate_limit_events_created_at_idx ON public.rate_limit_events(created_at DESC);

-- Do NOT index auth.users per user requirements. 
-- We will just filter auth.users inline. It's safe for moderate volumes.

-- 2. Create the chart series RPC
CREATE OR REPLACE FUNCTION public.admin_get_overview_chart_series(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_start_date date;
BEGIN
  -- 1. Security Check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: caller is not an admin' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Input Validation (Strict 7, 30, or 90)
  IF p_days NOT IN (7, 30, 90) THEN
    RAISE EXCEPTION 'Invalid p_days: must be 7, 30, or 90. Received %', p_days USING ERRCODE = '22023';
  END IF;

  -- 3. Calculate bounded start date
  v_start_date := current_date - (p_days - 1);

  -- 4. Aggregate data
  -- We build a complete series of dates and left join our tables to ensure no missing days.
  WITH date_series AS (
    SELECT generate_series(
      v_start_date::timestamp, 
      current_date::timestamp, 
      '1 day'::interval
    )::date AS d
  ),
  users_agg AS (
    SELECT d.d AS date, count(u.id)::integer AS val
    FROM date_series d
    LEFT JOIN auth.users u ON (u.created_at AT TIME ZONE 'UTC')::date = d.d
    GROUP BY d.d
  ),
  profiles_agg AS (
    SELECT d.d AS date, count(p.id)::integer AS val
    FROM date_series d
    LEFT JOIN public.profiles p ON (p.created_at AT TIME ZONE 'UTC')::date = d.d
    GROUP BY d.d
  ),
  audit_agg AS (
    SELECT d.d AS date, count(a.id)::integer AS val
    FROM date_series d
    LEFT JOIN public.admin_audit_events a ON (a.created_at AT TIME ZONE 'UTC')::date = d.d
    GROUP BY d.d
  ),
  security_agg AS (
    SELECT d.d AS date, count(s.id)::integer AS val
    FROM date_series d
    LEFT JOIN public.security_events s ON (s.created_at AT TIME ZONE 'UTC')::date = d.d
    GROUP BY d.d
  ),
  rate_limit_agg AS (
    SELECT d.d AS date, count(r.id)::integer AS val
    FROM date_series d
    LEFT JOIN public.rate_limit_events r ON (r.created_at AT TIME ZONE 'UTC')::date = d.d
    GROUP BY d.d
  )
  SELECT jsonb_build_object(
    'generatedAt', now()::text,
    'sourceVersion', 'phase-charts-1',
    'days', p_days,
    'cloudSyncEnabled', false,
    'series', jsonb_build_object(
      'usersByDay', (SELECT jsonb_agg(jsonb_build_object('date', date, 'value', val) ORDER BY date ASC) FROM users_agg),
      'profilesByDay', (SELECT jsonb_agg(jsonb_build_object('date', date, 'value', val) ORDER BY date ASC) FROM profiles_agg),
      'adminAuditByDay', (SELECT jsonb_agg(jsonb_build_object('date', date, 'value', val) ORDER BY date ASC) FROM audit_agg),
      'securityEventsByDay', (SELECT jsonb_agg(jsonb_build_object('date', date, 'value', val) ORDER BY date ASC) FROM security_agg),
      'rateLimitEventsByDay', (SELECT jsonb_agg(jsonb_build_object('date', date, 'value', val) ORDER BY date ASC) FROM rate_limit_agg)
    ),
    'unavailableSeries', jsonb_build_object(
      'cloudRowsByDay', 'Cloud sync is not implemented.'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 3. Lock down execution
REVOKE ALL ON FUNCTION public.admin_get_overview_chart_series(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_overview_chart_series(integer) TO authenticated;
