-- =============================================================================
-- 0006 — Admin Role Architecture (no self-promotion)
-- =============================================================================
-- Purpose: A production-safe role model for owner/admin/support/reviewer.
--
-- CORE SECURITY PROPERTY: a regular authenticated user CANNOT grant themselves
-- a role. This is guaranteed structurally, not by convention:
--   * public.user_roles has NO INSERT / UPDATE / DELETE policy for `authenticated`.
--     With RLS enabled and no permissive write policy, every client write is
--     denied. The service role bypasses RLS (server-only).
--   * The only in-database write path is grant_app_role() / revoke_app_role(),
--     which are SECURITY DEFINER and refuse to run unless the CALLER is already
--     an owner/admin. There is no bootstrap loophole.
--   * Roles do NOT live on profiles, so a profile UPDATE can never touch them.
--
-- BOOTSTRAP (first owner): insert exactly one owner row manually, once, using
-- the Supabase SQL Editor:
--     INSERT INTO public.user_roles (user_id, role, granted_by)
--     VALUES ('<YOUR-AUTH-USER-UUID>', 'owner', '<YOUR-AUTH-USER-UUID>');
-- After that, the owner uses grant_app_role() for everyone else.
--
-- Safe to re-run: CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION,
-- DROP POLICY IF EXISTS before CREATE POLICY.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. user_roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('owner','admin','support','reviewer')),
  granted_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_user_role_uniq UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS user_roles_user_idx ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles(role);

DROP TRIGGER IF EXISTS set_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER set_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Role-check helper functions
-- ---------------------------------------------------------------------------
-- Important order:
-- has_current_user_role -> is_admin/is_owner -> admin_has_app_role
-- because admin_has_app_role calls is_admin().

-- Remove old unsafe helper if it exists from any previous draft.
DROP FUNCTION IF EXISTS public.has_app_role(uuid, text);

-- Self-only: "does the CURRENT caller hold this role?"
CREATE OR REPLACE FUNCTION public.has_current_user_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles r
    WHERE r.user_id = auth.uid()
      AND r.role = required_role
  );
$$;

-- "Is the current caller an admin?" Owner is treated as admin.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles r
    WHERE r.user_id = auth.uid()
      AND r.role IN ('owner','admin')
  );
$$;

-- "Is the current caller an owner?"
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles r
    WHERE r.user_id = auth.uid()
      AND r.role = 'owner'
  );
$$;

-- Admin-only arbitrary lookup.
-- Returns false for non-admins, so normal users cannot enumerate roles.
CREATE OR REPLACE FUNCTION public.admin_has_app_role(target_user uuid, required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
     AND EXISTS (
       SELECT 1
       FROM public.user_roles r
       WHERE r.user_id = target_user
         AND r.role = required_role
     );
$$;

-- Lock down execution.
REVOKE ALL ON FUNCTION public.has_current_user_role(text)      FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_has_app_role(uuid, text)   FROM public, anon;
REVOKE ALL ON FUNCTION public.is_admin()                       FROM public, anon;
REVOKE ALL ON FUNCTION public.is_owner()                       FROM public, anon;

GRANT EXECUTE ON FUNCTION public.has_current_user_role(text)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_has_app_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner()                     TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS on user_roles — read-only for the client, NO write path
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

-- No INSERT/UPDATE/DELETE policies. Deliberate.

-- ---------------------------------------------------------------------------
-- 4. admin_audit_events — append-only record of privileged actions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action         text        NOT NULL CHECK (char_length(action) BETWEEN 1 AND 100),
  metadata       jsonb       NOT NULL DEFAULT '{}'::jsonb
                 CHECK (jsonb_typeof(metadata) = 'object'),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_actor_idx
  ON public.admin_audit_events(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_target_idx
  ON public.admin_audit_events(target_user_id, created_at DESC);

ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_select_admin" ON public.admin_audit_events;
CREATE POLICY "admin_audit_select_admin" ON public.admin_audit_events
  FOR SELECT
  USING (public.is_admin());

-- No client INSERT/UPDATE/DELETE policies.

-- ---------------------------------------------------------------------------
-- 5. Controlled grant / revoke — the only in-DB role write path
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_app_role(target_user uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'grant_app_role: no authenticated caller';
  END IF;

  IF new_role NOT IN ('owner','admin','support','reviewer') THEN
    RAISE EXCEPTION 'grant_app_role: invalid role %', new_role;
  END IF;

  -- Owner/admin are privileged roles and can only be granted by owner.
  IF new_role IN ('owner','admin') THEN
    IF NOT public.is_owner() THEN
      RAISE EXCEPTION 'grant_app_role: only an owner may grant %', new_role;
    END IF;
  ELSE
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'grant_app_role: only an admin/owner may grant %', new_role;
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (target_user, new_role, caller)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.admin_audit_events (actor_user_id, target_user_id, action, metadata)
  VALUES (
    caller,
    target_user,
    'grant_role',
    jsonb_build_object('role', new_role)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_app_role(target_user uuid, old_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'revoke_app_role: no authenticated caller';
  END IF;

  IF old_role NOT IN ('owner','admin','support','reviewer') THEN
    RAISE EXCEPTION 'revoke_app_role: invalid role %', old_role;
  END IF;

  IF old_role IN ('owner','admin') THEN
    IF NOT public.is_owner() THEN
      RAISE EXCEPTION 'revoke_app_role: only an owner may revoke %', old_role;
    END IF;
  ELSE
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'revoke_app_role: only an admin/owner may revoke %', old_role;
    END IF;
  END IF;

  -- Safety rail: never allow removing the last remaining owner.
  IF old_role = 'owner' THEN
    IF (SELECT count(*) FROM public.user_roles WHERE role = 'owner') <= 1 THEN
      RAISE EXCEPTION 'revoke_app_role: cannot remove the last owner';
    END IF;
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_user
    AND role = old_role;

  INSERT INTO public.admin_audit_events (actor_user_id, target_user_id, action, metadata)
  VALUES (
    caller,
    target_user,
    'revoke_role',
    jsonb_build_object('role', old_role)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_app_role(uuid, text)  FROM public, anon;
REVOKE ALL ON FUNCTION public.revoke_app_role(uuid, text) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.grant_app_role(uuid, text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_app_role(uuid, text) TO authenticated;

-- =============================================================================
-- Production stance on admin ACCESS TO USER CONTENT:
-- This migration deliberately does NOT add admin SELECT/UPDATE policies on
-- projects/scenes/etc. Support/admin operations on user content should go
-- through Edge Functions using the service role, with every action written to
-- admin_audit_events. Add narrow admin read policies later only if needed.
-- =============================================================================