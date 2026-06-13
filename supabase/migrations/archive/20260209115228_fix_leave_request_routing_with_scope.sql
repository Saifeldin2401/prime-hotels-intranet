-- Restore guardrails for leave-request routing while persisting property/department scope

CREATE OR REPLACE FUNCTION create_request_for_leave_request() RETURNS TRIGGER AS $$
DECLARE
  supervisor_id UUID;
  hr_assignee_id UUID;
  supervisor_role public.app_role;
  hr_role public.app_role;
  request_id UUID;
  request_no BIGINT;
  initial_status TEXT;
  hr_step_status TEXT;
  routing_meta JSONB;
BEGIN
  -- Get supervisor from profiles
  SELECT reporting_to INTO supervisor_id
  FROM public.profiles
  WHERE id = NEW.requester_id;

  -- Find HR assignee
  hr_assignee_id := find_hr_assignee(NEW.property_id);

  -- Resolve supervisor role (fallback to manager)
  SELECT ur.role INTO supervisor_role
  FROM public.user_roles ur
  WHERE ur.user_id = supervisor_id
  ORDER BY CASE ur.role
    WHEN 'property_manager' THEN 1
    WHEN 'department_head' THEN 2
    WHEN 'manager' THEN 3
    WHEN 'property_hr' THEN 4
    WHEN 'regional_hr' THEN 5
    WHEN 'regional_admin' THEN 6
    WHEN 'corporate_admin' THEN 7
    ELSE 100
  END
  LIMIT 1;

  IF supervisor_role IS NULL THEN
    supervisor_role := 'manager';
  END IF;

  -- Resolve HR role (prefer property_hr, then regional_hr, then regional_admin)
  SELECT ur.role INTO hr_role
  FROM public.user_roles ur
  WHERE ur.user_id = hr_assignee_id
    AND ur.role IN ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
  ORDER BY CASE ur.role
    WHEN 'property_hr' THEN 1
    WHEN 'regional_hr' THEN 2
    WHEN 'regional_admin' THEN 3
    WHEN 'corporate_admin' THEN 4
    ELSE 100
  END
  LIMIT 1;

  IF hr_role IS NULL THEN
    hr_role := 'regional_hr';
  END IF;

  routing_meta := jsonb_build_object(
    'missing_supervisor', supervisor_id IS NULL,
    'missing_hr_assignee', hr_assignee_id IS NULL
  );

  -- Determine initial workflow status
  initial_status := CASE
    WHEN NEW.status = 'pending' AND supervisor_id IS NULL THEN 'pending_hr_review'
    WHEN NEW.status = 'pending' THEN 'pending_supervisor_approval'
    ELSE 'draft'
  END;

  -- Create the request with scope
  INSERT INTO public.requests (
    entity_type,
    entity_id,
    requester_id,
    supervisor_id,
    current_assignee_id,
    status,
    submitted_at,
    metadata,
    property_id,
    department_id
  )
  VALUES (
    'leave_request',
    NEW.id,
    NEW.requester_id,
    supervisor_id,
    COALESCE(supervisor_id, hr_assignee_id),
    initial_status,
    CASE WHEN NEW.status = 'pending' THEN now() ELSE NULL END,
    jsonb_build_object(
      'leave_type', NEW.type,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'reason', NEW.reason,
      'routing_warning', routing_meta
    ),
    NEW.property_id,
    NEW.department_id
  )
  RETURNING id, request_no INTO request_id, request_no;

  -- Update leave request with workflow request ID
  UPDATE public.leave_requests
  SET workflow_request_id = request_id
  WHERE id = NEW.id;

  -- Supervisor step (if supervisor exists)
  IF supervisor_id IS NOT NULL THEN
    INSERT INTO public.request_steps (
      request_id,
      step_order,
      assignee_id,
      assignee_role,
      status,
      created_by
    )
    VALUES (
      request_id,
      1,
      supervisor_id,
      supervisor_role,
      CASE WHEN NEW.status = 'pending' THEN 'pending' ELSE 'waiting' END,
      NEW.requester_id
    );
  END IF;

  -- HR step (always created)
  hr_step_status := CASE
    WHEN NEW.status = 'pending' AND supervisor_id IS NULL THEN 'pending'
    ELSE 'waiting'
  END;

  INSERT INTO public.request_steps (
    request_id,
    step_order,
    assignee_id,
    assignee_role,
    status,
    created_by
  )
  VALUES (
    request_id,
    CASE WHEN supervisor_id IS NOT NULL THEN 2 ELSE 1 END,
    hr_assignee_id,
    hr_role,
    hr_step_status,
    NEW.requester_id
  );

  -- Notify admins/HR if routing is missing an assignee
  IF hr_assignee_id IS NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    SELECT ur.user_id,
           'escalation_alert',
           'Routing issue: Missing HR assignee',
           format('Leave request #%s requires HR assignment.', request_no),
           jsonb_build_object('request_id', request_id, 'entity_type', 'leave_request', 'reason', 'missing_hr_assignee')
    FROM public.user_roles ur
    WHERE ur.role IN ('regional_admin', 'regional_hr', 'corporate_admin');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
;
