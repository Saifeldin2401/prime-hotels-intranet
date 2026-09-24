-- process_employee_transfer set training_progress.status = 'cancelled', which is
-- not a training_status value (not_started, in_progress, completed, expired): the
-- cast failed at plan time, so every transfer errored. Waived assignments now
-- retire only the untouched (not_started) progress rows they seeded.

CREATE OR REPLACE FUNCTION public.process_employee_transfer(p_user_id uuid, p_target_hotel_id uuid, p_target_dept_id uuid, p_target_role text, p_reason text, p_actor_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- Authority always comes from the session; p_actor_id is honoured only for
  -- trusted server-side (service_role) callers acting on someone's behalf.
  v_caller_id uuid := CASE WHEN COALESCE(auth.role(), '') = 'service_role'
                           THEN COALESCE(p_actor_id, auth.uid()) ELSE auth.uid() END;
  v_is_platform boolean;
  v_org_id uuid;
  v_old_hotel_id uuid;
  v_old_dept_id uuid;
  v_old_role text;
  v_target_role_enum public.membership_role;
  v_waived_count integer := 0;
  v_waived_ids uuid[];
  v_assigned_count integer := 0;
  v_rule record;
  v_module_id uuid;
BEGIN
  IF v_caller_id IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  SELECT organization_id, hotel_id, department_id, role::text
    INTO v_org_id, v_old_hotel_id, v_old_dept_id, v_old_role
    FROM public.organization_memberships
   WHERE user_id = p_user_id AND is_active = true
   ORDER BY is_primary DESC, created_at ASC
   LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Active organization membership not found for user %', p_user_id;
  END IF;

  v_is_platform := COALESCE(auth.role(), '') = 'service_role' OR public.is_platform_super_admin();

  IF NOT v_is_platform AND NOT public.is_tenant_people_admin(v_org_id) THEN
    RAISE EXCEPTION 'Access denied: not authorized to transfer employees in this organization' USING ERRCODE = '42501';
  END IF;

  BEGIN
    v_target_role_enum := p_target_role::public.membership_role;
  EXCEPTION WHEN OTHERS THEN
    v_target_role_enum := 'learner'::public.membership_role;
  END;

  -- Tenant people-admins cannot mint owners, and only tenant admins grant admin.
  IF NOT v_is_platform THEN
    IF v_target_role_enum = 'organization_owner' AND v_old_role IS DISTINCT FROM 'organization_owner' THEN
      RAISE EXCEPTION 'Only the platform can transfer organization ownership' USING ERRCODE = '42501';
    END IF;
    IF v_target_role_enum IN ('organization_admin', 'brand_admin') AND NOT public.is_tenant_admin(v_org_id) THEN
      RAISE EXCEPTION 'Only organization admins can grant admin roles' USING ERRCODE = '42501';
    END IF;
    IF p_user_id = v_caller_id AND v_target_role_enum::text IS DISTINCT FROM v_old_role THEN
      RAISE EXCEPTION 'You cannot change your own role' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.employee_transfer_logs (
    user_id, organization_id,
    previous_hotel_id, new_hotel_id, from_hotel_id, to_hotel_id,
    previous_department_id, new_department_id, from_department_id, to_department_id,
    previous_role, new_role, from_role, to_role,
    notes, reason, transferred_by, transfer_effective_date, created_at
  ) VALUES (
    p_user_id, v_org_id,
    v_old_hotel_id, p_target_hotel_id, v_old_hotel_id, p_target_hotel_id,
    v_old_dept_id, p_target_dept_id, v_old_dept_id, p_target_dept_id,
    v_old_role, v_target_role_enum::text, v_old_role, v_target_role_enum::text,
    p_reason, p_reason, v_caller_id, CURRENT_DATE, now()
  );

  UPDATE public.organization_memberships
     SET hotel_id = p_target_hotel_id,
         department_id = p_target_dept_id,
         role = v_target_role_enum,
         updated_at = now()
   WHERE user_id = p_user_id AND organization_id = v_org_id;

  UPDATE public.profiles SET updated_at = now() WHERE id = p_user_id;

  -- Waive optional, hotel-specific individual assignments from the old hotel, and
  -- retire the untouched progress rows they seeded (work already started stays).
  WITH waived_rows AS (
    UPDATE public.training_assignment_rules r
       SET is_active = false,
           status = 'waived',
           instructions = COALESCE(r.instructions || ' | ', '') || 'Waived due to transfer to new hotel'
     WHERE r.organization_id = v_org_id
       AND r.target_type = 'user' AND r.target_id = p_user_id::text
       AND r.is_active AND NOT COALESCE(r.is_deleted, false)
       AND r.is_mandatory IS NOT TRUE
       AND r.hotel_id IS NOT NULL
       AND r.hotel_id IS DISTINCT FROM p_target_hotel_id
    RETURNING r.id
  )
  SELECT array_agg(id) INTO v_waived_ids FROM waived_rows;
  v_waived_count := COALESCE(cardinality(v_waived_ids), 0);

  IF v_waived_count > 0 THEN
    UPDATE public.training_progress tp
       SET is_deleted = true,
           updated_at = now()
     WHERE tp.user_id = p_user_id
       AND tp.status = 'not_started'
       AND tp.assignment_id = ANY (v_waived_ids);
  END IF;

  -- Standing rules for the new hotel / department / role.
  FOR v_rule IN
    SELECT tar.training_module_id, tar.content_id, tar.is_mandatory, COALESCE(tar.due_in_days, 14) AS due_in_days
      FROM public.training_assignment_rules tar
     WHERE tar.is_active AND NOT COALESCE(tar.is_deleted, false)
       AND tar.organization_id = v_org_id
       AND public._is_standing_assignment_rule(tar.target_type, tar.target_user_ids)
       AND (tar.hotel_id IS NULL OR tar.hotel_id = p_target_hotel_id OR (tar.scope_type = 'hotel' AND tar.scope_id = p_target_hotel_id))
       AND (tar.department_id IS NULL OR tar.department_id = p_target_dept_id OR (tar.scope_type = 'department' AND tar.scope_id = p_target_dept_id))
       AND (tar.target_role IS NULL OR tar.target_role = 'all' OR tar.target_role = v_target_role_enum::text)
  LOOP
    v_module_id := COALESCE(v_rule.training_module_id, v_rule.content_id);
    IF v_module_id IS NOT NULL
       AND public._assign_module_to_user(
             v_org_id, p_user_id, v_module_id, now() + make_interval(days => v_rule.due_in_days),
             v_rule.is_mandatory, v_caller_id, p_target_hotel_id, p_target_dept_id,
             'Assigned via transfer delta evaluation') IS NOT NULL THEN
      v_assigned_count := v_assigned_count + 1;
    END IF;
  END LOOP;

  UPDATE public.employee_transfer_logs
     SET waived_obsolete_courses_count = v_waived_count,
         assigned_delta_courses_count = v_assigned_count
   WHERE user_id = p_user_id
     AND organization_id = v_org_id
     AND transfer_effective_date = CURRENT_DATE
     AND to_hotel_id IS NOT DISTINCT FROM p_target_hotel_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'from_hotel_id', v_old_hotel_id,
    'to_hotel_id', p_target_hotel_id,
    'waived_count', v_waived_count,
    'assigned_count', v_assigned_count
  );
END;
$function$;
