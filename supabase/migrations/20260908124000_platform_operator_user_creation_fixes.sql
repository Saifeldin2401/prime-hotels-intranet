-- Migration: 20260908124000_platform_operator_user_creation_fixes.sql
-- Intent:
--   1. Allow profiles.organization_id to be nullable so platform-level operators
--      (system owners, platform admins, platform support) can be created without
--      requiring an arbitrary tenant organization.
--   2. Allow user_roles.organization_id to be nullable for global/system role assignments.
--   3. Update assign_platform_role, revoke_platform_role, and set_platform_user_active
--      to explicitly allow both 'platform_admin' and 'system_owner' operators.

BEGIN;

-- 1. Profiles, user_roles, and user_invitations organization_id nullability
ALTER TABLE public.profiles ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.user_invitations ALTER COLUMN organization_id DROP NOT NULL;

-- 2. Platform operator role management RPCs
CREATE OR REPLACE FUNCTION public.assign_platform_role(
  p_user_id uuid,
  p_role text,
  p_scope_type text DEFAULT 'global'::text,
  p_scope_org_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT (public.platform_operator_has_role('platform_admin') OR public.platform_operator_has_role('system_owner')) THEN
    RAISE EXCEPTION 'Only platform admins may assign platform roles' USING ERRCODE = '42501';
  END IF;
  IF p_role = 'system_owner' AND NOT public.platform_operator_has_role('system_owner') THEN
    RAISE EXCEPTION 'Only a system owner may grant system_owner' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.platform_users (user_id, created_by) VALUES (p_user_id, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET is_active = true, deactivated_at = NULL;
  UPDATE public.platform_role_assignments SET revoked_at = now(), revoked_by = auth.uid()
   WHERE platform_user_id = p_user_id AND platform_role = p_role::public.platform_role AND revoked_at IS NULL;
  INSERT INTO public.platform_role_assignments (platform_user_id, platform_role, scope_type, scope_org_ids, granted_by)
  VALUES (p_user_id, p_role::public.platform_role, p_scope_type, COALESCE(p_scope_org_ids,'{}'), auth.uid())
  RETURNING id INTO v_id;
  INSERT INTO public.platform_audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'assign_platform_role', 'platform_role_assignment', v_id::text,
          jsonb_build_object('target_user', p_user_id, 'role', p_role, 'scope_type', p_scope_type));
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_platform_role(
  p_user_id uuid,
  p_role text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.platform_operator_has_role('platform_admin') OR public.platform_operator_has_role('system_owner')) THEN
    RAISE EXCEPTION 'Only platform admins may revoke platform roles' USING ERRCODE = '42501';
  END IF;
  UPDATE public.platform_role_assignments SET revoked_at = now(), revoked_by = auth.uid()
   WHERE platform_user_id = p_user_id AND platform_role = p_role::public.platform_role AND revoked_at IS NULL;
  INSERT INTO public.platform_audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'revoke_platform_role', 'platform_role_assignment', p_user_id::text,
          jsonb_build_object('target_user', p_user_id, 'role', p_role));
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_platform_user_active(
  p_user_id uuid,
  p_active boolean
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.platform_operator_has_role('platform_admin') OR public.platform_operator_has_role('system_owner')) THEN
    RAISE EXCEPTION 'Only platform admins may change operator status' USING ERRCODE = '42501';
  END IF;
  UPDATE public.platform_users SET is_active = p_active,
         deactivated_at = CASE WHEN p_active THEN NULL ELSE now() END
   WHERE user_id = p_user_id;
  INSERT INTO public.platform_audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), CASE WHEN p_active THEN 'activate_platform_user' ELSE 'deactivate_platform_user' END,
          'platform_user', p_user_id::text, jsonb_build_object('target_user', p_user_id));
END;
$function$;

COMMIT;
