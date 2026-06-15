-- =============================================================================
-- 0010 — Admin Users List RPC
-- =============================================================================
-- Purpose:
--   Provides one admin-only data contract for the future Users list. The
--   function returns a minimal paginated user summary and does not expose raw
--   auth metadata, phone numbers, profile bio/location fields, avatar paths,
--   project content, or scene content.
--
-- Security stance:
--   * Callable by authenticated users only.
--   * Fails closed unless the current caller satisfies public.is_admin()
--     (owner/admin in the current role model).
--   * SECURITY DEFINER is used so the function can read auth.users without
--     adding broad frontend SELECT policies.
--   * No dynamic SQL. All referenced objects are schema-qualified.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_search text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_profile_completed boolean DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_search text := nullif(btrim(p_search), '');
  v_role text := nullif(btrim(p_role), '');
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_total integer := 0;
  v_returned integer := 0;
  v_users jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required'
      USING ERRCODE = '42501';
  END IF;

  IF v_role IS NOT NULL AND v_role NOT IN ('owner', 'admin', 'support', 'reviewer') THEN
    RAISE EXCEPTION 'Invalid role filter'
      USING ERRCODE = '22023';
  END IF;

  WITH base AS (
    SELECT
      u.id AS user_id,
      u.email,
      u.created_at,
      u.last_sign_in_at,
      coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.nickname), '')) AS display_name,
      coalesce(p.profile_completed, false) AS profile_completed,
      p.avatar_path IS NOT NULL AS has_uploaded_avatar,
      coalesce(role_rows.roles, ARRAY[]::text[]) AS roles
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN LATERAL (
      SELECT array_agg(
        ur.role
        ORDER BY CASE ur.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'support' THEN 3
          WHEN 'reviewer' THEN 4
          ELSE 99
        END
      ) AS roles
      FROM public.user_roles ur
      WHERE ur.user_id = u.id
    ) role_rows ON true
    WHERE
      (
        v_search IS NULL
        OR u.email ILIKE '%' || v_search || '%'
        OR coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.nickname), '')) ILIKE '%' || v_search || '%'
      )
      AND (v_role IS NULL OR v_role = ANY(coalesce(role_rows.roles, ARRAY[]::text[])))
      AND (p_profile_completed IS NULL OR coalesce(p.profile_completed, false) = p_profile_completed)
  ),
  counted AS (
    SELECT count(*)::integer AS total
    FROM base
  ),
  page_rows AS (
    SELECT *
    FROM base
    ORDER BY created_at DESC, user_id DESC
    LIMIT v_limit OFFSET v_offset
  ),
  payload AS (
    SELECT
      (SELECT total FROM counted) AS total,
      count(pr.user_id)::integer AS returned,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'userId', pr.user_id,
            'email', pr.email,
            'displayName', pr.display_name,
            'createdAt', pr.created_at,
            'lastSignInAt', pr.last_sign_in_at,
            'profileCompleted', pr.profile_completed,
            'hasUploadedAvatar', pr.has_uploaded_avatar,
            'roles', to_jsonb(pr.roles),
            'isOwner', 'owner' = ANY(pr.roles),
            'isAdmin', 'owner' = ANY(pr.roles) OR 'admin' = ANY(pr.roles)
          )
          ORDER BY pr.created_at DESC, pr.user_id DESC
        ) FILTER (WHERE pr.user_id IS NOT NULL),
        '[]'::jsonb
      ) AS users
    FROM page_rows pr
  )
  SELECT total, returned, users
  INTO v_total, v_returned, v_users
  FROM payload;

  RETURN jsonb_build_object(
    'generatedAt', now(),
    'sourceVersion', 'phase-f1',
    'page', jsonb_build_object(
      'limit', v_limit,
      'offset', v_offset,
      'returned', v_returned,
      'total', v_total,
      'hasMore', (v_offset + v_returned) < v_total
    ),
    'filters', jsonb_build_object(
      'search', v_search,
      'role', v_role,
      'profileCompleted', p_profile_completed
    ),
    'users', v_users
  );
END;
$$;

COMMENT ON FUNCTION public.admin_list_users(text, text, boolean, integer, integer) IS
  'Admin-only paginated Users list contract. Returns minimal user summaries for owner/admin callers; never returns raw auth metadata, phone, profile bio/location fields, avatar paths, project content, or scene content.';

REVOKE ALL ON FUNCTION public.admin_list_users(text, text, boolean, integer, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, boolean, integer, integer) TO authenticated;
