-- Phase 10: harden cross-tenant operator access.
-- Was: client INSERTs into platform_access_sessions with any access_reason, no TTL, no
-- server enforcement; sessions stayed active forever if the browser never called exit.

-- 1. TTL column + expiry in the active-session check
ALTER TABLE public.platform_access_sessions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour');

CREATE OR REPLACE FUNCTION public.has_active_platform_session(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_access_sessions
    WHERE admin_user_id = auth.uid()
      AND target_organization_id = p_org_id
      AND is_active = true
      AND (ended_at IS NULL OR ended_at > now())
      AND expires_at > now()
  );
$fn$;

-- 2. Server-enforced session start (reason required, self only, TTL, audited)
CREATE OR REPLACE FUNCTION public.start_platform_session(
  p_org_id uuid, p_reason text, p_acting_role text DEFAULT 'organization_admin',
  p_ttl_minutes integer DEFAULT 60)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_session_id uuid;
BEGIN
  IF NOT public.is_platform_super_admin() THEN
    RAISE EXCEPTION 'Only platform operators may enter a tenant' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A substantive access reason (>= 10 chars) is required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'Unknown organization' USING ERRCODE = '23503';
  END IF;

  UPDATE public.platform_access_sessions
     SET is_active = false, ended_at = now()
   WHERE admin_user_id = auth.uid() AND is_active = true;

  INSERT INTO public.platform_access_sessions
    (admin_user_id, target_organization_id, acting_role, access_reason, is_active, started_at, expires_at)
  VALUES
    (auth.uid(), p_org_id, COALESCE(p_acting_role,'organization_admin'), btrim(p_reason), true, now(),
     now() + (LEAST(GREATEST(p_ttl_minutes,5), 480) || ' minutes')::interval)
  RETURNING id INTO v_session_id;

  INSERT INTO public.platform_audit_logs (actor_id, target_organization_id, session_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_org_id, v_session_id, 'enter_tenant', 'platform_access_session', v_session_id::text,
          jsonb_build_object('acting_role', p_acting_role, 'access_reason', btrim(p_reason)));

  RETURN v_session_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.end_platform_session(p_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_row public.platform_access_sessions;
BEGIN
  SELECT * INTO v_row FROM public.platform_access_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_row.admin_user_id <> auth.uid() AND NOT public.is_platform_super_admin() THEN
    RAISE EXCEPTION 'Not your session' USING ERRCODE = '42501';
  END IF;
  UPDATE public.platform_access_sessions SET is_active = false, ended_at = now() WHERE id = p_session_id;
  INSERT INTO public.platform_audit_logs (actor_id, target_organization_id, session_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), v_row.target_organization_id, p_session_id, 'exit_tenant', 'platform_access_session', p_session_id::text,
          jsonb_build_object('duration_seconds', EXTRACT(EPOCH FROM (now() - v_row.started_at))::int));
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.start_platform_session(uuid,text,text,integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.end_platform_session(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.start_platform_session(uuid,text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_platform_session(uuid) TO authenticated;

-- 3. Lock the table
DROP POLICY IF EXISTS "platform_access_sessions_admin_only" ON public.platform_access_sessions;
CREATE POLICY platform_access_sessions_sel ON public.platform_access_sessions FOR SELECT TO authenticated
USING (public.is_platform_super_admin() OR admin_user_id = auth.uid());
CREATE POLICY platform_access_sessions_ins ON public.platform_access_sessions FOR INSERT TO authenticated
WITH CHECK (admin_user_id = auth.uid() AND public.is_platform_super_admin());
CREATE POLICY platform_access_sessions_upd ON public.platform_access_sessions FOR UPDATE TO authenticated
USING (public.is_platform_super_admin() OR admin_user_id = auth.uid())
WITH CHECK (public.is_platform_super_admin() OR admin_user_id = auth.uid());
CREATE POLICY platform_access_sessions_del ON public.platform_access_sessions FOR DELETE TO authenticated
USING (public.is_platform_super_admin());

-- 4. platform_audit_logs: immutable — SELECT for super admin; writes only via SECURITY DEFINER / service_role
DROP POLICY IF EXISTS "platform_audit_logs_policy" ON public.platform_audit_logs;
CREATE POLICY platform_audit_logs_sel ON public.platform_audit_logs FOR SELECT TO authenticated
USING (public.is_platform_super_admin());
