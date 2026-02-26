-- Ensure promotion/transfer requests carry property/department scope

-- 1) Backfill existing requests for promotions
UPDATE public.requests r
SET
  property_id = up.property_id,
  department_id = COALESCE(p.new_department_id, p.old_department_id)
FROM public.promotions p
LEFT JOIN public.user_properties up ON up.user_id = p.employee_id
WHERE r.entity_type = 'promotion'
  AND r.entity_id = p.id
  AND (r.property_id IS NULL OR r.department_id IS NULL);

-- 2) Backfill existing requests for transfers (use target property/department)
UPDATE public.requests r
SET
  property_id = t.to_property_id,
  department_id = t.to_department_id
FROM public.transfers t
WHERE r.entity_type = 'transfer'
  AND r.entity_id = t.id
  AND (r.property_id IS NULL OR r.department_id IS NULL);

-- 3) Update submit_promotion_request to persist scope
CREATE OR REPLACE FUNCTION public.submit_promotion_request(
    p_employee_id UUID,
    p_new_role app_role,
    p_new_job_title TEXT,
    p_new_department_id UUID,
    p_effective_date DATE,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_promotion_id UUID;
    v_request_id UUID;
    v_request_no BIGINT;
    v_requester_id UUID := auth.uid();
    v_old_role app_role;
    v_old_job_title TEXT;
    v_old_department_id UUID;
    v_property_id UUID;
    v_hr_assignee UUID;
    v_hr_role app_role;
    v_routing_meta JSONB;
BEGIN
    -- Get current employee details
    SELECT job_title INTO v_old_job_title FROM public.profiles WHERE id = p_employee_id;
    SELECT role INTO v_old_role FROM public.user_roles WHERE user_id = p_employee_id LIMIT 1;
    SELECT department_id INTO v_old_department_id FROM public.user_departments WHERE user_id = p_employee_id LIMIT 1;
    SELECT property_id INTO v_property_id FROM public.user_properties WHERE user_id = p_employee_id LIMIT 1;

    -- 1. Create Promotion Record (Status: pending)
    INSERT INTO public.promotions (
        employee_id, promoted_by, old_role, new_role,
        old_job_title, new_job_title, old_department_id, new_department_id,
        effective_date, notes, status
    ) VALUES (
        p_employee_id, v_requester_id, v_old_role, p_new_role,
        v_old_job_title, p_new_job_title, v_old_department_id, p_new_department_id,
        p_effective_date, p_notes, 'pending'
    ) RETURNING id INTO v_promotion_id;

    -- 2. Find HR Assignee (Property HR first, then regional HR/admin)
    v_hr_assignee := find_hr_assignee(v_property_id);

    SELECT ur.role INTO v_hr_role
    FROM public.user_roles ur
    WHERE ur.user_id = v_hr_assignee
      AND ur.role IN ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
    ORDER BY CASE ur.role
      WHEN 'property_hr' THEN 1
      WHEN 'regional_hr' THEN 2
      WHEN 'regional_admin' THEN 3
      WHEN 'corporate_admin' THEN 4
      ELSE 100
    END
    LIMIT 1;

    IF v_hr_role IS NULL THEN
        v_hr_role := 'regional_hr';
    END IF;

    v_routing_meta := jsonb_build_object('missing_hr_assignee', v_hr_assignee IS NULL);

    -- 3. Create Request with scope
    INSERT INTO public.requests (
        entity_type, entity_id, requester_id, current_assignee_id, status, metadata,
        property_id, department_id
    ) VALUES (
        'promotion',
        v_promotion_id,
        v_requester_id,
        v_hr_assignee,
        'pending_hr_review',
        jsonb_build_object(
            'employee_name', (SELECT full_name FROM profiles WHERE id = p_employee_id),
            'new_role', p_new_role,
            'effective_date', p_effective_date,
            'routing_warning', v_routing_meta
        ),
        v_property_id,
        COALESCE(p_new_department_id, v_old_department_id)
    ) RETURNING id, request_no INTO v_request_id, v_request_no;

    -- 4. Create Initial Request Step
    INSERT INTO public.request_steps (
        request_id, step_order, assignee_id, assignee_role, status
    ) VALUES (
        v_request_id, 1, v_hr_assignee, v_hr_role, 'pending'
    );

    -- Notify admins/HR if HR assignee missing
    IF v_hr_assignee IS NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      SELECT ur.user_id,
             'escalation_alert',
             'Routing issue: Missing HR assignee',
             format('Promotion request #%s requires HR assignment.', v_request_no),
             jsonb_build_object('request_id', v_request_id, 'entity_type', 'promotion', 'reason', 'missing_hr_assignee')
      FROM public.user_roles ur
      WHERE ur.role IN ('regional_admin', 'regional_hr', 'corporate_admin');
    END IF;

    RETURN jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
END;
$$;

-- 4) Update submit_transfer_request to persist scope
CREATE OR REPLACE FUNCTION public.submit_transfer_request(
    p_employee_id UUID,
    p_to_property_id UUID,
    p_to_department_id UUID,
    p_effective_date DATE,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer_id UUID;
    v_request_id UUID;
    v_request_no BIGINT;
    v_requester_id UUID := auth.uid();
    v_from_property_id UUID;
    v_from_department_id UUID;
    v_hr_assignee UUID;
    v_hr_role app_role;
    v_routing_meta JSONB;
BEGIN
    -- Get current details
    SELECT property_id INTO v_from_property_id FROM public.user_properties WHERE user_id = p_employee_id LIMIT 1;
    SELECT department_id INTO v_from_department_id FROM public.user_departments WHERE user_id = p_employee_id LIMIT 1;

    -- 1. Create Transfer Record
    INSERT INTO public.transfers (
        employee_id, from_property_id, to_property_id,
        from_department_id, to_department_id, effective_date, notes, status
    ) VALUES (
        p_employee_id, v_from_property_id, p_to_property_id,
        v_from_department_id, p_to_department_id, p_effective_date, p_notes, 'pending'
    ) RETURNING id INTO v_transfer_id;

    -- 2. Find HR Assignee (Target Property HR or Regional)
    v_hr_assignee := find_hr_assignee(p_to_property_id);

    SELECT ur.role INTO v_hr_role
    FROM public.user_roles ur
    WHERE ur.user_id = v_hr_assignee
      AND ur.role IN ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
    ORDER BY CASE ur.role
      WHEN 'property_hr' THEN 1
      WHEN 'regional_hr' THEN 2
      WHEN 'regional_admin' THEN 3
      WHEN 'corporate_admin' THEN 4
      ELSE 100
    END
    LIMIT 1;

    IF v_hr_role IS NULL THEN
        v_hr_role := 'regional_hr';
    END IF;

    v_routing_meta := jsonb_build_object('missing_hr_assignee', v_hr_assignee IS NULL);

    -- 3. Create Request with scope
    INSERT INTO public.requests (
        entity_type, entity_id, requester_id, current_assignee_id, status, metadata,
        property_id, department_id
    ) VALUES (
        'transfer',
        v_transfer_id,
        v_requester_id,
        v_hr_assignee,
        'pending_hr_review',
        jsonb_build_object(
            'employee_name', (SELECT full_name FROM profiles WHERE id = p_employee_id),
            'target_property', (SELECT name FROM properties WHERE id = p_to_property_id),
            'effective_date', p_effective_date,
            'routing_warning', v_routing_meta
        ),
        p_to_property_id,
        p_to_department_id
    ) RETURNING id, request_no INTO v_request_id, v_request_no;

    -- 4. Create Initial Request Step
    INSERT INTO public.request_steps (
        request_id, step_order, assignee_id, assignee_role, status
    ) VALUES (
        v_request_id, 1, v_hr_assignee, v_hr_role, 'pending'
    );

    -- Notify admins/HR if HR assignee missing
    IF v_hr_assignee IS NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      SELECT ur.user_id,
             'escalation_alert',
             'Routing issue: Missing HR assignee',
             format('Transfer request #%s requires HR assignment.', v_request_no),
             jsonb_build_object('request_id', v_request_id, 'entity_type', 'transfer', 'reason', 'missing_hr_assignee')
      FROM public.user_roles ur
      WHERE ur.role IN ('regional_admin', 'regional_hr', 'corporate_admin');
    END IF;

    RETURN jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
END;
$$;
;
