-- =============================================================================
-- 0009 — Admin Overview Metrics RPC (aggregate-only)
-- =============================================================================
-- Purpose:
--   Provides one admin-only RPC for the future Overview dashboard. The function
--   returns aggregate counts only. It does not expose user rows, emails, avatar
--   paths, project content, scene prompts, storage object paths, IP hashes, or
--   event metadata.
--
-- Security stance:
--   * Callable by authenticated users only.
--   * Fails closed unless the current caller satisfies public.is_admin()
--     (owner/admin in the current role model).
--   * SECURITY DEFINER is used so the function can compute safe aggregate counts
--     without adding broad frontend SELECT policies.
--   * No dynamic SQL. All referenced objects are schema-qualified.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_get_overview_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  metrics jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required'
      USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'generatedAt', now(),
    'sourceVersion', 'phase-e1',
    'cloudSyncEnabled', false,
    'users', jsonb_build_object(
      'total', (SELECT count(*) FROM auth.users),
      'new7d', (SELECT count(*) FROM auth.users WHERE created_at >= now() - interval '7 days'),
      'new30d', (SELECT count(*) FROM auth.users WHERE created_at >= now() - interval '30 days')
    ),
    'profiles', jsonb_build_object(
      'total', (SELECT count(*) FROM public.profiles),
      'completed', (SELECT count(*) FROM public.profiles WHERE profile_completed IS TRUE),
      'withUploadedAvatar', (SELECT count(*) FROM public.profiles WHERE avatar_path IS NOT NULL)
    ),
    'roles', jsonb_build_object(
      'owners', (SELECT count(*) FROM public.user_roles WHERE role = 'owner'),
      'admins', (SELECT count(*) FROM public.user_roles WHERE role = 'admin'),
      'support', (SELECT count(*) FROM public.user_roles WHERE role = 'support'),
      'reviewers', (SELECT count(*) FROM public.user_roles WHERE role = 'reviewer')
    ),
    'events', jsonb_build_object(
      'adminAudit24h', (SELECT count(*) FROM public.admin_audit_events WHERE created_at >= now() - interval '24 hours'),
      'adminAudit7d', (SELECT count(*) FROM public.admin_audit_events WHERE created_at >= now() - interval '7 days'),
      'security24h', (SELECT count(*) FROM public.security_events WHERE created_at >= now() - interval '24 hours'),
      'security7d', (SELECT count(*) FROM public.security_events WHERE created_at >= now() - interval '7 days'),
      'rateLimit24h', (SELECT count(*) FROM public.rate_limit_events WHERE created_at >= now() - interval '24 hours'),
      'rateLimit7d', (SELECT count(*) FROM public.rate_limit_events WHERE created_at >= now() - interval '7 days')
    ),
    'cloudRows', jsonb_build_object(
      'projects', (SELECT count(*) FROM public.projects),
      'scenes', (SELECT count(*) FROM public.scenes),
      'sceneAssets', (SELECT count(*) FROM public.scene_assets)
    ),
    'storage', jsonb_build_object(
      'avatars', NULL,
      'referenceImages', NULL
    )
  ) INTO metrics;

  RETURN metrics;
END;
$$;

COMMENT ON FUNCTION public.admin_get_overview_metrics() IS
  'Admin-only aggregate metrics for the Overview dashboard. Returns counts only; never returns user rows, emails, avatar paths, project content, scene prompts, storage paths, IP hashes, or event metadata.';

REVOKE ALL ON FUNCTION public.admin_get_overview_metrics() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_overview_metrics() TO authenticated;
