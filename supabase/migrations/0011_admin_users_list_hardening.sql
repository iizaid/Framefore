-- =============================================================================
-- 0011 — Admin Users List Hardening
-- =============================================================================
-- Purpose:
--   Production-hardening patch for the Phase F1 Users list data contract
--   created in 0010_admin_users_list.sql. This migration is forward-only:
--   0010 has already been applied, so it is left untouched and this file
--   re-creates the function with the same shape plus scale/search/pagination
--   safety, and adds helpful supporting indexes.
--
-- What this hardens:
--   1. Search wildcard behavior — user-supplied % _ \ are escaped so they are
--      treated as literals (ESCAPE '\'); a max length guard avoids heavy scans.
--   2. Role normalization — p_role is lowercased before validation.
--   3. Offset abuse — large OFFSET scans are rejected (MVP cap 10000).
--      This is still OFFSET pagination for the MVP; cursor (keyset) pagination
--      should be considered later if the user base grows large.
--   4. Helpful indexes for the role and profile-completed filters.
--
-- Not changed:
--   * Security stance (authenticated-only, fails closed unless is_admin()).
--   * Returned fields / response shape.
--   * No dynamic SQL; all referenced objects are schema-qualified.
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
  v_search_escaped text;
  v_role text := lower(nullif(btrim(p_role), ''));
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

  -- Cap search length to keep ILIKE scans bounded.
  IF v_search IS NOT NULL AND length(v_search) > 100 THEN
    RAISE EXCEPTION 'Search filter is too long'
      USING ERRCODE = '22023';
  END IF;

  -- Escape LIKE wildcards so user input is matched literally.
  -- Order matters: escape the escape character (backslash) first.
  IF v_search IS NOT NULL THEN
    v_search_escaped := replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_');
  END IF;

  IF v_role IS NOT NULL AND v_role NOT IN ('owner', 'admin', 'support', 'reviewer') THEN
    RAISE EXCEPTION 'Invalid role filter'
      USING ERRCODE = '22023';
  END IF;

  -- Guard against very large OFFSET scans (MVP only).
  IF v_offset > 10000 THEN
    RAISE EXCEPTION 'Pagination offset is too large'
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
        OR u.email ILIKE '%' || v_search_escaped || '%' ESCAPE '\'
        OR coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.nickname), '')) ILIKE '%' || v_search_escaped || '%' ESCAPE '\'
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
  'Admin-only paginated Users list contract (hardened in 0011). Returns minimal user summaries for owner/admin callers; never returns raw auth metadata, phone, profile bio/location fields, avatar paths, project content, or scene content. Search wildcards are escaped, search length is capped at 100, role is normalized lowercase, and offset is capped at 10000.';

REVOKE ALL ON FUNCTION public.admin_list_users(text, text, boolean, integer, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, boolean, integer, integer) TO authenticated;

-- =============================================================================
-- Supporting indexes
-- =============================================================================
-- These live on public schema tables only. We intentionally do NOT add an index
-- on auth.users for email search: the auth schema is Supabase-managed, adding
-- indexes there can conflict with platform migrations and is not guaranteed safe
-- on hosted projects. Email search remains an ILIKE scan for the MVP; if email
-- search volume grows, revisit with a trigram (pg_trgm) index on a public
-- mirror/materialized column rather than touching auth.users.

-- Speeds up the role filter and the per-user role aggregation join.
CREATE INDEX IF NOT EXISTS user_roles_role_user_id_idx
  ON public.user_roles(role, user_id);

-- Speeds up the profile-completed filter and the profiles join by id.
CREATE INDEX IF NOT EXISTS profiles_profile_completed_id_idx
  ON public.profiles(profile_completed, id);
