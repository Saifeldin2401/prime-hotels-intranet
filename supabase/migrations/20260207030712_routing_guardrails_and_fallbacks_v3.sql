-- 1. Improve find_hr_assignee to include ultimate fallback to corporate admin
-- Using original parameter name 'property_id' to allow CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.find_hr_assignee(property_id UUID) RETURNS UUID AS $$
DECLARE
  v_hr_user_id UUID;
BEGIN
  -- A. Find property HR
  SELECT up.user_id INTO v_hr_user_id
  FROM public.user_properties up
  JOIN public.user_roles ur ON up.user_id = ur.user_id
  JOIN public.roles r ON ur.role_id = r.id
  WHERE up.property_id = find_hr_assignee.property_id
    AND r.name = 'property_hr'
  LIMIT 1;
  
  -- B. Fallback to regional HR
  IF v_hr_user_id IS NULL THEN
    SELECT ur.user_id INTO v_hr_user_id
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE r.name = 'regional_hr'
    LIMIT 1;
  END IF;

  -- C. ULTIMATE FALLBACK: Find any Corporate Admin if no HR is available
  IF v_hr_user_id IS NULL THEN
    SELECT ur.user_id INTO v_hr_user_id
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE r.name = 'corporate_admin'
    LIMIT 1;
  END IF;
  
  RETURN v_hr_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Enhance create_request_for_leave_request with alerts for missing structures
CREATE OR REPLACE FUNCTION public.create_request_for_leave_request() RETURNS TRIGGER AS $$
DECLARE
  v_supervisor_id UUID;
  v_hr_assignee_id UUID;
  v_request_id UUID;
  v_request_no BIGINT;
BEGIN
  -- Get supervisor from profiles
  SELECT reporting_to INTO v_supervisor_id 
  FROM public.profiles 
  WHERE id = NEW.requester_id;
  
  -- Find HR assignee with corporate fallback
  -- This now calls the improved version with corporate fallback
  v_hr_assignee_id := public.find_hr_assignee(NEW.property_id);
  
  -- Create the request
  INSERT INTO public.requests (
    entity_type, 
    entity_id, 
    requester_id, 
    supervisor_id, 
    current_assignee_id, 
    status, 
    submitted_at, 
    metadata,
    property_id
  )
  VALUES (
    'leave_request',
    NEW.id,
    NEW.requester_id,
    v_supervisor_id,
    COALESCE(v_supervisor_id, v_hr_assignee_id), -- Start with supervisor, fallback to HR/Corp Admin
    CASE WHEN NEW.status = 'pending' THEN 'pending_supervisor_approval' ELSE 'draft' END,
    CASE WHEN NEW.status = 'pending' THEN now() ELSE NULL END,
    jsonb_build_object(
      'leave_type', NEW.type,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'reason', NEW.reason,
      'routing_warning', jsonb_build_object(
        'missing_supervisor', v_supervisor_id IS NULL,
        'missing_hr', (v_hr_assignee_id IS NULL)
      )
    ),
    NEW.property_id
  )
  RETURNING id, request_no INTO v_request_id, v_request_no;
  
  -- Update leave request with workflow request ID
  UPDATE public.leave_requests 
  SET workflow_request_id = v_request_id 
  WHERE id = NEW.id;
  
  -- Create workflow steps
  IF v_supervisor_id IS NOT NULL THEN
    -- Supervisor step
    INSERT INTO public.request_steps (request_id, step_order, assignee_id, assignee_role, status, created_by)
    VALUES (v_request_id, 1, v_supervisor_id, 'supervisor', 
            CASE WHEN NEW.status = 'pending' THEN 'pending' ELSE 'waiting' END, NEW.requester_id);
  END IF;
  
  -- HR/Corp Admin step (always created)
  INSERT INTO public.request_steps (request_id, step_order, assignee_id, assignee_role, status, created_by)
  VALUES (v_request_id, 
          CASE WHEN v_supervisor_id IS NOT NULL THEN 2 ELSE 1 END, 
          v_hr_assignee_id, 
          'hr', 
          CASE WHEN NEW.status = 'pending' AND v_supervisor_id IS NULL THEN 'pending' ELSE 'waiting' END, 
          NEW.requester_id);

  -- ALERT: If supervisor is missing and request is pending, notify admins/HR
  IF v_supervisor_id IS NULL AND NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    SELECT ur.user_id,
           'escalation_alert',
           'Routing issue: Missing Supervisor',
           format('Leave request #%s from %s missing supervisor. Routed to HR/Admin.', 
                  COALESCE(v_request_no::text, '?'), 
                  COALESCE((SELECT full_name FROM public.profiles WHERE id = NEW.requester_id), 'Unknown')),
           jsonb_build_object('request_id', v_request_id, 'entity_type', 'leave_request', 'reason', 'missing_supervisor')
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE r.name IN ('regional_admin', 'regional_hr', 'corporate_admin');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
;
