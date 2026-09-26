-- Exception queues for the Organization and Platform workspace homes.
-- Read-only. Each returns one row per thing that needs a person to act,
-- scoped and permission-checked on the server.

-- Organization > Overview: setup gaps that block people from learning.
CREATE OR REPLACE FUNCTION public.get_org_setup_gaps(p_org_id uuid)
RETURNS TABLE(kind text, subject_id uuid, subject_name text, detail text, since timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.tenant_can(p_org_id, 'org.admin') OR public.tenant_can(p_org_id, 'people.manage')) THEN
    RAISE EXCEPTION 'You are not allowed to view setup for this organization'
      USING ERRCODE = '42501', HINT = 'ORG_ADMIN_REQUIRED';
  END IF;

  RETURN QUERY
  -- Members not placed in a hotel or department get no targeted training.
  SELECT 'unplaced_member'::text, m.user_id, COALESCE(p.full_name, p.email)::text,
         CASE WHEN m.hotel_id IS NULL AND m.department_id IS NULL THEN 'hotel_and_department'
              WHEN m.hotel_id IS NULL THEN 'hotel' ELSE 'department' END,
         m.created_at
    FROM public.organization_memberships m
    LEFT JOIN public.profiles p ON p.id = m.user_id
   WHERE m.organization_id = p_org_id AND m.is_active
     AND m.role::text NOT IN ('organization_owner', 'organization_admin', 'brand_admin')
     AND (m.hotel_id IS NULL OR m.department_id IS NULL)
  UNION ALL
  -- Invitations waiting on the invitee, or already expired.
  SELECT CASE WHEN i.expires_at IS NOT NULL AND i.expires_at < now() THEN 'expired_invitation' ELSE 'pending_invitation' END,
         i.id, i.email::text, i.role::text, COALESCE(i.invited_at, i.created_at)
    FROM public.user_invitations i
   WHERE i.organization_id = p_org_id AND i.accepted_at IS NULL
     AND lower(COALESCE(i.status, 'pending')) IN ('pending', 'sent', 'expired')
  UNION ALL
  -- Hotels nobody administers.
  SELECT 'hotel_without_admin', h.id, h.name, NULL::text, h.created_at
    FROM public.hotels h
   WHERE h.organization_id = p_org_id AND COALESCE(h.is_deleted, false) = false AND COALESCE(h.is_active, true)
     AND NOT EXISTS (SELECT 1 FROM public.organization_memberships m
                      WHERE m.organization_id = p_org_id AND m.hotel_id = h.id AND m.is_active
                        AND m.role::text = 'hotel_admin')
  UNION ALL
  -- Departments without a manager cannot follow up overdue training.
  SELECT 'department_without_manager', d.id, d.name, h.name::text, d.created_at
    FROM public.departments d
    LEFT JOIN public.hotels h ON h.id = d.hotel_id
   WHERE d.organization_id = p_org_id AND COALESCE(d.is_deleted, false) = false AND COALESCE(d.is_active, true)
     AND d.manager_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.organization_memberships m
                      WHERE m.organization_id = p_org_id AND m.department_id = d.id AND m.is_active
                        AND m.role::text = 'department_manager')
  UNION ALL
  -- Branding shown on certificates, emails and sign-in.
  SELECT 'missing_logo', o.id, o.name, NULL::text, o.created_at
    FROM public.organizations o
   WHERE o.id = p_org_id AND o.logo_url IS NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_org_setup_gaps(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_org_setup_gaps(uuid) TO authenticated;

-- Platform > Exceptions: organizations and operations that need an operator.
CREATE OR REPLACE FUNCTION public.get_platform_exceptions()
RETURNS TABLE(kind text, organization_id uuid, organization_name text, subject_id uuid, detail text, since timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.platform_operator_can('tenant.read') THEN
    RAISE EXCEPTION 'Platform exceptions require platform operator access'
      USING ERRCODE = '42501', HINT = 'PLATFORM_OPERATOR_REQUIRED';
  END IF;

  RETURN QUERY
  SELECT 'suspended_organization'::text, o.id, o.name, o.id, o.lifecycle_status::text, o.created_at
    FROM public.organizations o
   WHERE COALESCE(o.is_deleted, false) = false AND o.lifecycle_status::text = 'suspended'
  UNION ALL
  SELECT 'trial_ending', o.id, o.name, o.id, NULL::text, o.trial_ends_at
    FROM public.organizations o
   WHERE COALESCE(o.is_deleted, false) = false AND o.lifecycle_status::text = 'trial'
     AND o.trial_ends_at IS NOT NULL AND o.trial_ends_at < now() + interval '14 days'
  UNION ALL
  SELECT 'subscription_problem', s.organization_id, o.name, s.id, s.status, s.current_period_end
    FROM public.subscriptions s
    JOIN public.organizations o ON o.id = s.organization_id
   WHERE lower(COALESCE(s.status, '')) IN ('past_due', 'unpaid', 'incomplete', 'canceled', 'cancelled')
     AND COALESCE(o.is_deleted, false) = false
  UNION ALL
  SELECT 'organization_without_admin', o.id, o.name, o.id, NULL::text, o.created_at
    FROM public.organizations o
   WHERE COALESCE(o.is_deleted, false) = false
     AND o.lifecycle_status::text NOT IN ('archived', 'prospect')
     AND NOT EXISTS (SELECT 1 FROM public.organization_memberships m
                      WHERE m.organization_id = o.id AND m.is_active
                        AND m.role::text IN ('organization_owner', 'organization_admin'))
  UNION ALL
  SELECT 'failed_job', j.organization_id, o.name, j.id, left(COALESCE(j.error_message, j.mode), 200), j.updated_at
    FROM public.course_generation_jobs j
    LEFT JOIN public.organizations o ON o.id = j.organization_id
   WHERE j.status IN ('failed', 'error') AND j.updated_at > now() - interval '7 days'
  UNION ALL
  SELECT 'active_session', s.target_organization_id, o.name, s.id, left(s.access_reason, 200), s.started_at
    FROM public.platform_access_sessions s
    JOIN public.organizations o ON o.id = s.target_organization_id
   WHERE s.is_active AND (s.ended_at IS NULL OR s.ended_at > now()) AND s.expires_at > now();
END;
$function$;

REVOKE ALL ON FUNCTION public.get_platform_exceptions() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_exceptions() TO authenticated;
