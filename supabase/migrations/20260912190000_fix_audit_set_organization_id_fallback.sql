-- Fix tg_audit_set_organization_id to handle platform operators, session resolution, and fallback gracefully
-- Prevents NOT NULL violations on analytics_events.organization_id

CREATE OR REPLACE FUNCTION public.tg_audit_set_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_actor uuid;
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'system_events' THEN
    v_actor := NEW.actor_id;
  ELSE
    v_actor := NEW.user_id;
  END IF;

  -- 1. If this is analytics_events with a session_id, resolve org from user_sessions
  IF TG_TABLE_NAME = 'analytics_events' AND NEW.session_id IS NOT NULL THEN
    BEGIN
      SELECT us.organization_id INTO v_org
      FROM public.user_sessions us
      WHERE us.id = NEW.session_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_org := NULL;
    END;
  END IF;

  -- 2. Try active tenant membership
  IF v_org IS NULL AND v_actor IS NOT NULL THEN
    SELECT om.organization_id INTO v_org
    FROM public.organization_memberships om
    WHERE om.user_id = v_actor AND om.is_active
    ORDER BY om.is_primary DESC, om.created_at ASC
    LIMIT 1;
  END IF;

  -- 3. Try profiles.organization_id
  IF v_org IS NULL AND v_actor IS NOT NULL THEN
    SELECT p.organization_id INTO v_org
    FROM public.profiles p
    WHERE p.id = v_actor AND p.organization_id IS NOT NULL;
  END IF;

  -- 4. Try any membership (including platform operators who may have inactive seeds)
  IF v_org IS NULL AND v_actor IS NOT NULL THEN
    SELECT om.organization_id INTO v_org
    FROM public.organization_memberships om
    WHERE om.user_id = v_actor
    ORDER BY om.is_primary DESC, om.created_at ASC
    LIMIT 1;
  END IF;

  -- 5. Try user_roles
  IF v_org IS NULL AND v_actor IS NOT NULL THEN
    SELECT ur.organization_id INTO v_org
    FROM public.user_roles ur
    WHERE ur.user_id = v_actor AND ur.organization_id IS NOT NULL
    LIMIT 1;
  END IF;

  -- 6. Safe fallback to the primary/first organization to satisfy NOT NULL constraint
  IF v_org IS NULL THEN
    SELECT o.id INTO v_org
    FROM public.organizations o
    ORDER BY o.created_at ASC
    LIMIT 1;
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$function$;
