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
-- the Supabase SQL Editor (which runs as service-role / postgres):
--     INSERT INTO public.user_roles (user_id, role, granted_by)
--     VALUES ('<YOUR-AUTH-USER-UUID>', 'owner', '<YOUR-AUTH-USER-UUID>');
-- After that, the owner uses grant_app_role() for everyone else.
-- See supabase/ADMIN_MODEL.md.
--
-- Safe to re-run: CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION,
-- DROP POLICY IF EXISTS before CREATE POLICY.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. user_roles
-- ---------------------------------------------------------------------------
-- role is text + CHECK (not an enum) so the migration stays idempotent — adding
-- enum values later is awkward; a CHECK list is trivial to extend.
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('owner','admin','support','reviewer')),
  -- Who granted this role (audit breadcrumb). SET NULL if that admin is deleted.
  granted_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- A user holds each role at most once.
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
-- SECURITY DEFINER so they can read user_roles regardless of the caller's RLS
-- view (a user can confirm their own admin status; policies can call is_admin()
-- without needing a SELECT policy that exposes other users' role rows).
-- No dynamic SQL anywhere. Explicit search_path. STABLE (no writes).

CREATE OR REPLACE FUNCTION public.has_app_role(uid uuid, required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = uid AND r.role = required_role
  );
$$;

-- "Is the current caller an admin?" — owner is a superset of admin.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role IN ('owner','admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role = 'owner'
  );
$$;

-- Lock down execution: revoke from anonymous, allow signed-in users to call.
REVOKE ALL ON FUNCTION public.has_app_role(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.is_admin()                FROM public, anon;
REVOKE ALL ON FUNCTION public.is_owner()                FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_app_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner()                TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS on user_roles — read-only for the client, NO write path
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- A user may see their OWN role rows (e.g., to toggle admin UI). Admins may see
-- everyone's (for support). No one may INSERT/UPDATE/DELETE via the client —
-- there is intentionally no write policy, so all client writes are denied.
DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- (No INSERT/UPDATE/DELETE policies. This is deliberate — see header.)

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

CREATE INDEX IF NOT EXISTS admin_audit_actor_idx  ON public.admin_audit_events(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_target_idx ON public.admin_audit_events(target_user_id, created_at DESC);

ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;

-- Admins can READ the audit log. Regular users cannot read global audit data.
DROP POLICY IF EXISTS "admin_audit_select_admin" ON public.admin_audit_events;
CREATE POLICY "admin_audit_select_admin" ON public.admin_audit_events
  FOR SELECT USING (public.is_admin());

-- No client INSERT/UPDATE/DELETE policies: rows are written only by the
-- SECURITY DEFINER grant/revoke functions below (and service role).

-- ---------------------------------------------------------------------------
-- 5. Controlled grant / revoke — the only in-DB role write path
-- ---------------------------------------------------------------------------
-- Authorization rules (least privilege):
--   * Only an OWNER may grant or revoke 'owner' or 'admin'.
--   * An ADMIN (or owner) may grant or revoke 'support' or 'reviewer'.
--   * Anyone else → exception. A user can never escalate themselves because the
--     function checks the CALLER's existing role first.
-- Both functions write an admin_audit_events row. No dynamic SQL.

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

  -- Privileged roles require owner; lesser roles require admin-or-owner.
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
  VALUES (caller, target_user, 'grant_role', jsonb_build_object('role', new_role));
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

  IF old_role IN ('owner','admin') THEN
    IF NOT public.is_owner() THEN
      RAISE EXCEPTION 'revoke_app_role: only an owner may revoke %', old_role;
    END IF;
  ELSE
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'revoke_app_role: only an admin/owner may revoke %', old_role;
    END IF;
  END IF;

  -- Safety rail: never allow removing the last remaining owner (lock-out guard).
  IF old_role = 'owner' THEN
    IF (SELECT count(*) FROM public.user_roles WHERE role = 'owner') <= 1 THEN
      RAISE EXCEPTION 'revoke_app_role: cannot remove the last owner';
    END IF;
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_user AND role = old_role;

  INSERT INTO public.admin_audit_events (actor_user_id, target_user_id, action, metadata)
  VALUES (caller, target_user, 'revoke_role', jsonb_build_object('role', old_role));
END;
$$;

-- These mutate roles. Even though they self-check the caller, keep them off the
-- anon role entirely; only signed-in users may attempt them (and will be
-- rejected unless already owner/admin).
REVOKE ALL ON FUNCTION public.grant_app_role(uuid, text)  FROM public, anon;
REVOKE ALL ON FUNCTION public.revoke_app_role(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.grant_app_role(uuid, text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_app_role(uuid, text) TO authenticated;

-- =============================================================================
-- Production stance on admin ACCESS TO USER CONTENT (documented decision):
--   This migration deliberately does NOT add admin SELECT/UPDATE policies on
--   projects/scenes/etc. Admin RLS over user content is broad and easy to leak.
--   Support/admin operations on user data should go through Edge Functions using
--   the service role, with every action written to admin_audit_events. Add
--   narrow, explicit admin read policies later only if a concrete support flow
--   requires them. See supabase/ADMIN_MODEL.md.
-- =============================================================================
