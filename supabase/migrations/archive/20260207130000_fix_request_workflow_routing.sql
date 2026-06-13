-- Fix request workflow role resolution and leave request routing
-- Uses user_roles.role (app_role) instead of non-existent roles table

CREATE OR REPLACE FUNCTION is_hr(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = is_hr.user_id
      AND ur.role IN ('regional_admin', 'regional_hr', 'property_hr')
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = is_admin.user_id
      AND ur.role = 'regional_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.find_hr_assignee(uuid);

CREATE OR REPLACE FUNCTION find_hr_assignee(property_id UUID) RETURNS UUID AS $$
DECLARE
  hr_user_id UUID;
BEGIN
  -- Find property HR first
  SELECT up.user_id INTO hr_user_id
  FROM public.user_properties up
  JOIN public.user_roles ur ON up.user_id = ur.user_id
  WHERE up.property_id = find_hr_assignee.property_id
    AND ur.role = 'property_hr'
  LIMIT 1;

  -- If no property HR, find regional HR
  IF hr_user_id IS NULL THEN
    SELECT ur.user_id INTO hr_user_id
    FROM public.user_roles ur
    WHERE ur.role = 'regional_hr'
    LIMIT 1;
  END IF;

  -- Final fallback to regional admin
  IF hr_user_id IS NULL THEN
    SELECT ur.user_id INTO hr_user_id
    FROM public.user_roles ur
    WHERE ur.role = 'regional_admin'
    LIMIT 1;
  END IF;

  RETURN hr_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure leave requests route correctly when no supervisor exists
CREATE OR REPLACE FUNCTION create_request_for_leave_request() RETURNS TRIGGER AS $$
DECLARE
  supervisor_id UUID;
  hr_assignee_id UUID;
  supervisor_role public.app_role;
  hr_role public.app_role;
  request_id UUID;
  initial_status TEXT;
  hr_step_status TEXT;
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

  -- Determine initial workflow status
  initial_status := CASE
    WHEN NEW.status = 'pending' AND supervisor_id IS NULL THEN 'pending_hr_review'
    WHEN NEW.status = 'pending' THEN 'pending_supervisor_approval'
    ELSE 'draft'
  END;

  -- Create the request
  INSERT INTO public.requests (
    entity_type,
    entity_id,
    requester_id,
    supervisor_id,
    current_assignee_id,
    status,
    submitted_at,
    metadata
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
      'reason', NEW.reason
    )
  )
  RETURNING id INTO request_id;

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: normalize legacy leave-request workflows without supervisors
UPDATE public.requests
SET status = 'pending_hr_review'
WHERE entity_type = 'leave_request'
  AND supervisor_id IS NULL
  AND status = 'pending_supervisor_approval';

UPDATE public.request_steps rs
SET status = 'pending'
FROM public.requests r
WHERE rs.request_id = r.id
  AND r.entity_type = 'leave_request'
  AND r.supervisor_id IS NULL
  AND rs.assignee_role IN ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
  AND rs.status = 'waiting'
  AND r.status IN ('pending_hr_review', 'pending_supervisor_approval');
