
CREATE OR REPLACE FUNCTION public.can_view_employee_public_profile(p_target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_roles public.app_role[];
  v_property_ids uuid[];
  v_department_ids uuid[];
BEGIN
  IF v_uid IS NULL OR p_target_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_uid = p_target_user_id THEN
    RETURN true;
  END IF;

  SELECT COALESCE(array_agg(ur.role), ARRAY[]::public.app_role[])
  INTO v_roles
  FROM public.user_roles ur
  WHERE ur.user_id = v_uid;

  IF (
    'corporate_admin'::public.app_role = ANY(v_roles) OR
    'regional_admin'::public.app_role = ANY(v_roles) OR
    'regional_hr'::public.app_role = ANY(v_roles)
  ) THEN
    RETURN true;
  END IF;

  SELECT COALESCE(array_agg(om.hotel_id), ARRAY[]::uuid[])
  INTO v_property_ids
  FROM public.organization_memberships om
  WHERE om.user_id = v_uid AND om.is_active = true AND om.hotel_id IS NOT NULL;

  SELECT COALESCE(array_agg(om.department_id), ARRAY[]::uuid[])
  INTO v_department_ids
  FROM public.organization_memberships om
  WHERE om.user_id = v_uid AND om.is_active = true AND om.department_id IS NOT NULL;

  IF 'department_head'::public.app_role = ANY(v_roles) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      WHERE om.user_id = p_target_user_id AND om.is_active = true
        AND om.department_id = ANY(v_department_ids)
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.user_id = p_target_user_id AND om.is_active = true
      AND om.hotel_id = ANY(v_property_ids)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_property_access(required_property_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF required_property_id IS NULL THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'corporate_admin', 'regional_admin', 'regional_hr')
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid()
    AND is_active = true
    AND hotel_id = required_property_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_finance_approver(property_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_approver_id uuid;
begin
  select om.user_id into v_approver_id
  from public.organization_memberships om
  join public.user_roles ur on ur.user_id = om.user_id
  where om.hotel_id = find_finance_approver.property_id
    and om.is_active = true
    and ur.role = 'property_manager'::public.app_role
  limit 1;

  if v_approver_id is null then
    select ur.user_id into v_approver_id
    from public.user_roles ur
    where ur.role = 'regional_admin'::public.app_role
    limit 1;
  end if;

  if v_approver_id is null then
    select ur.user_id into v_approver_id
    from public.user_roles ur
    where ur.role = 'corporate_admin'::public.app_role
    limit 1;
  end if;

  return v_approver_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.find_hr_assignee(property_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_hr_user_id uuid;
begin
  select om.user_id into v_hr_user_id
  from public.organization_memberships om
  join public.user_roles ur on ur.user_id = om.user_id
  where om.hotel_id = find_hr_assignee.property_id
    and om.is_active = true
    and ur.role = 'property_hr'::public.app_role
  limit 1;

  if v_hr_user_id is null then
    select ur.user_id into v_hr_user_id
    from public.user_roles ur
    where ur.role = 'regional_hr'::public.app_role
    limit 1;
  end if;

  if v_hr_user_id is null then
    select ur.user_id into v_hr_user_id
    from public.user_roles ur
    where ur.role = 'corporate_admin'::public.app_role
    limit 1;
  end if;

  return v_hr_user_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_document_viewers_by_department(p_document_id uuid)
 RETURNS TABLE(department_name text, count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(d.name,'Unknown'), COUNT(DISTINCT se.actor_id)
  FROM public.system_events se
  LEFT JOIN public.organization_memberships ud ON ud.user_id = se.actor_id AND ud.is_active = true
  LEFT JOIN public.departments d ON d.id = ud.department_id
  WHERE se.event_type = 'doc_view'
    AND se.entity_id = p_document_id
    AND EXISTS (
      SELECT 1 FROM public.documents doc
      WHERE doc.id = p_document_id
        AND (
          doc.created_by = (select auth.uid())
          OR doc.owner_id = (select auth.uid())
          OR public.is_hr_or_admin((select auth.uid()))
        )
    )
  GROUP BY d.name
  ORDER BY count DESC
  LIMIT 20;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_departments(user_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(department_id), ARRAY[]::uuid[])
  FROM public.organization_memberships
  WHERE organization_memberships.user_id = $1 AND is_active = true AND department_id IS NOT NULL;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_properties(user_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(hotel_id), ARRAY[]::uuid[])
  FROM public.organization_memberships
  WHERE organization_memberships.user_id = $1 AND is_active = true AND hotel_id IS NOT NULL;
$function$;
