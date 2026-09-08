-- create_scoped_training_assignment had never executed successfully — three
-- latent bugs on the happy path (training_assignment_rules had 0 rows from this
-- path; only the trigger / direct-write paths populated it):
--   1. referenced non-existent identifier p_eligible_users (should be v_eligible_users)
--   2. 'enrolled'::enrollment_status — not a valid enum value
--      ({not_started,in_progress,completed,expired})
--   3. inserted a value into notifications.is_read, now a GENERATED column
-- Same failure class as the historical create_task_atomic / apply_request_step_sla bugs.

CREATE OR REPLACE FUNCTION public.create_scoped_training_assignment(
  p_course_id uuid, p_scope_type text, p_organization_id uuid,
  p_brand_id uuid DEFAULT NULL::uuid, p_hotel_id uuid DEFAULT NULL::uuid,
  p_department_id uuid DEFAULT NULL::uuid, p_target_role text DEFAULT NULL::text,
  p_target_user_ids uuid[] DEFAULT NULL::uuid[],
  p_due_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_priority text DEFAULT 'normal'::text, p_instructions text DEFAULT NULL::text,
  p_requires_acknowledgement boolean DEFAULT false, p_notify_on_due boolean DEFAULT true,
  p_reminder_days_before integer[] DEFAULT '{7,3,1}'::integer[])
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_scopes jsonb; v_can_org boolean;
  v_auth_hotels uuid[]; v_auth_depts uuid[]; v_auth_brands uuid[];
  v_rule_id uuid; v_eligible_users uuid[] := '{}'; v_user_id uuid;
  v_course_title text := 'Training Module';
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Authentication required to assign training.'; END IF;

  SELECT title INTO v_course_title FROM public.training_modules WHERE id = p_course_id AND is_deleted IS NOT TRUE;
  IF v_course_title IS NULL THEN
    SELECT title INTO v_course_title FROM public.courses WHERE id = p_course_id AND is_deleted IS NOT TRUE;
  END IF;
  IF v_course_title IS NULL THEN RAISE EXCEPTION 'Selected course does not exist or has been deleted.'; END IF;

  v_scopes := public.get_caller_assignment_scopes(p_organization_id);
  v_can_org := (v_scopes->>'can_assign_org')::boolean IS TRUE OR (v_scopes->>'is_platform_admin')::boolean IS TRUE;

  IF NOT v_can_org THEN
    IF v_scopes->'authorized_hotel_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_hotel_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_hotel_ids')::uuid) INTO v_auth_hotels; END IF;
    IF v_scopes->'authorized_dept_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_dept_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_dept_ids')::uuid) INTO v_auth_depts; END IF;
    IF v_scopes->'authorized_brand_ids' IS NOT NULL AND jsonb_array_length(v_scopes->'authorized_brand_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_brand_ids')::uuid) INTO v_auth_brands; END IF;
    IF p_scope_type = 'organization' THEN RAISE EXCEPTION 'Access denied: You do not have organization-wide assignment authority.';
    ELSIF p_scope_type = 'brand' AND (v_auth_brands IS NULL OR NOT (p_brand_id = ANY(v_auth_brands))) THEN RAISE EXCEPTION 'Access denied: not authorized for this brand.';
    ELSIF p_scope_type = 'hotel' AND (v_auth_hotels IS NULL OR NOT (p_hotel_id = ANY(v_auth_hotels))) THEN RAISE EXCEPTION 'Access denied: not authorized for this hotel.';
    ELSIF p_scope_type = 'department' AND (v_auth_depts IS NULL OR NOT (p_department_id = ANY(v_auth_depts))) THEN RAISE EXCEPTION 'Access denied: not authorized for this department.';
    END IF;
  END IF;

  IF p_scope_type = 'individual' AND p_target_user_ids IS NOT NULL THEN
    SELECT ARRAY(SELECT DISTINCT om.user_id FROM public.organization_memberships om
      WHERE om.organization_id = p_organization_id AND om.is_active = true AND om.user_id = ANY(p_target_user_ids)
        AND (v_can_org OR v_auth_hotels IS NULL OR om.hotel_id = ANY(v_auth_hotels))
        AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))) INTO v_eligible_users;
  ELSE
    SELECT ARRAY(SELECT DISTINCT om.user_id FROM public.organization_memberships om
      LEFT JOIN public.hotels h ON h.id = om.hotel_id
      WHERE om.organization_id = p_organization_id AND om.is_active = true
        AND (v_can_org OR v_auth_hotels IS NULL OR om.hotel_id = ANY(v_auth_hotels))
        AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))
        AND (v_can_org OR v_auth_brands IS NULL OR om.brand_id = ANY(v_auth_brands) OR h.brand_id = ANY(v_auth_brands))
        AND (p_brand_id IS NULL OR om.brand_id = p_brand_id OR h.brand_id = p_brand_id)
        AND (p_hotel_id IS NULL OR om.hotel_id = p_hotel_id)
        AND (p_department_id IS NULL OR om.department_id = p_department_id)
        AND (p_target_role IS NULL OR p_target_role = 'all' OR om.role::text = p_target_role)) INTO v_eligible_users;
  END IF;

  IF array_length(v_eligible_users, 1) IS NULL OR array_length(v_eligible_users, 1) = 0 THEN
    RAISE EXCEPTION 'No eligible active learners found in the selected assignment scope.';
  END IF;

  INSERT INTO public.training_assignment_rules (
    training_module_id, content_id, content_type, organization_id, brand_id, hotel_id, department_id,
    target_role, target_type, target_id, scope_type, scope_id, target_user_ids, recipient_count,
    due_date, priority, instructions, requires_acknowledgement, notify_on_due, reminder_days_before,
    assigned_by, created_by, is_active, status
  ) VALUES (
    p_course_id, p_course_id, 'module', p_organization_id, p_brand_id, p_hotel_id, p_department_id,
    p_target_role, p_scope_type,
    COALESCE(p_hotel_id::text, p_department_id::text, p_brand_id::text, p_organization_id::text),
    p_scope_type, COALESCE(p_hotel_id, p_department_id, p_brand_id, p_organization_id),
    v_eligible_users, array_length(v_eligible_users, 1), p_due_date, p_priority, p_instructions,
    p_requires_acknowledgement, p_notify_on_due, p_reminder_days_before, v_caller_id, v_caller_id, true, 'active'
  ) RETURNING id INTO v_rule_id;

  FOREACH v_user_id IN ARRAY v_eligible_users LOOP
    INSERT INTO public.training_progress (user_id, training_id, assignment_id, organization_id, lp_content_type, status, created_at, updated_at)
    VALUES (v_user_id, p_course_id, v_rule_id, p_organization_id, 'module', 'not_started'::training_status, now(), now())
    ON CONFLICT (user_id, training_id) DO UPDATE SET assignment_id = EXCLUDED.assignment_id, organization_id = EXCLUDED.organization_id, updated_at = now();

    INSERT INTO public.enrollments (user_id, course_id, assignment_id, organization_id, status, enrolled_at, created_at, updated_at)
    VALUES (v_user_id, p_course_id, v_rule_id, p_organization_id, 'not_started'::enrollment_status, now(), now(), now())
    ON CONFLICT (user_id, course_id) DO UPDATE SET assignment_id = EXCLUDED.assignment_id, organization_id = EXCLUDED.organization_id, updated_at = now();

    INSERT INTO public.notifications (user_id, title, message, type, link, created_at)
    VALUES (v_user_id, 'New Training Assigned: ' || v_course_title,
      COALESCE(p_instructions, 'You have been assigned to complete "' || v_course_title || '".'),
      'training_assigned', '/training/player/' || p_course_id, now());
  END LOOP;

  IF (v_scopes->>'is_platform_admin')::boolean IS TRUE THEN
    INSERT INTO public.platform_audit_logs (actor_id, action, resource_type, resource_id, target_organization_id, metadata)
    VALUES (v_caller_id, 'create_training_assignment', 'training_assignment_rules', v_rule_id, p_organization_id,
      jsonb_build_object('course_id', p_course_id, 'course_title', v_course_title, 'scope_type', p_scope_type,
                         'recipient_count', array_length(v_eligible_users, 1), 'due_date', p_due_date));
  END IF;

  RETURN jsonb_build_object('success', true, 'rule_id', v_rule_id, 'course_id', p_course_id,
                            'recipient_count', array_length(v_eligible_users, 1), 'scope_type', p_scope_type);
END;
$function$;
