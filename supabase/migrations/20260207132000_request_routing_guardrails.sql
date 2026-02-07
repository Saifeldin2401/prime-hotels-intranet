-- Guardrails for request routing when supervisor or HR assignee is missing

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
      'reason', NEW.reason,
      'routing_warning', routing_meta
    )
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

-- Update request_apply_action to alert when next step has no assignee
CREATE OR REPLACE FUNCTION request_apply_action(
  p_request_id UUID,
  p_action TEXT,
  p_comment TEXT DEFAULT NULL,
  p_forward_to UUID DEFAULT NULL,
  p_visibility TEXT DEFAULT 'all'
) RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  req RECORD;
  current_step RECORD;
  next_step RECORD;
  actor_id UUID := auth.uid();
BEGIN
  SELECT * INTO req FROM public.requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Request not found';
    RETURN;
  END IF;

  IF NOT public.can_view_request(actor_id, p_request_id) THEN
    RETURN QUERY SELECT FALSE, 'Access denied';
    RETURN;
  END IF;

  SELECT * INTO current_step FROM public.request_steps
  WHERE request_id = p_request_id AND status = 'pending'
  ORDER BY step_order LIMIT 1;

  IF current_step IS NULL AND p_action IN ('approve', 'reject', 'return', 'forward') THEN
    RETURN QUERY SELECT FALSE, 'No pending step found';
    RETURN;
  END IF;

  CASE p_action
    WHEN 'approve' THEN
      UPDATE public.request_steps
      SET status = 'approved', acted_at = now(), comment = p_comment
      WHERE id = current_step.id;

      SELECT * INTO next_step FROM public.request_steps
      WHERE request_id = p_request_id AND step_order > current_step.step_order AND status = 'waiting'
      ORDER BY step_order LIMIT 1;

      IF next_step IS NOT NULL THEN
        UPDATE public.request_steps
        SET status = 'pending', assignee_id = next_step.assignee_id
        WHERE id = next_step.id;

        UPDATE public.requests
        SET status = 'pending_hr_review',
            current_assignee_id = next_step.assignee_id,
            metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{routing_warning,missing_hr_assignee}', to_jsonb(next_step.assignee_id IS NULL), true)
        WHERE id = p_request_id;

        IF next_step.assignee_id IS NULL THEN
          INSERT INTO public.notifications (user_id, type, title, message, metadata)
          SELECT ur.user_id,
                 'escalation_alert',
                 'Routing issue: Missing HR assignee',
                 format('Request #%s has no HR assignee.', req.request_no),
                 jsonb_build_object('request_id', req.id, 'entity_type', req.entity_type, 'reason', 'missing_hr_assignee')
          FROM public.user_roles ur
          WHERE ur.role IN ('regional_admin', 'regional_hr', 'corporate_admin');
        END IF;
      ELSE
        UPDATE public.requests
        SET status = 'approved', current_assignee_id = NULL, closed_at = now()
        WHERE id = p_request_id;

        IF req.entity_type = 'leave_request' THEN
          UPDATE public.leave_requests
          SET status = 'approved',
              approved_by_id = actor_id,
              updated_at = now()
          WHERE id = req.entity_id;
        END IF;
      END IF;

      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'approved', jsonb_build_object('comment', p_comment));

    WHEN 'reject' THEN
      UPDATE public.request_steps
      SET status = 'rejected', acted_at = now(), comment = p_comment
      WHERE id = current_step.id;

      UPDATE public.requests
      SET status = 'rejected', current_assignee_id = NULL, closed_at = now()
      WHERE id = p_request_id;

      IF req.entity_type = 'leave_request' THEN
        UPDATE public.leave_requests
        SET status = 'rejected',
            rejected_by_id = actor_id,
            rejection_reason = p_comment,
            updated_at = now()
        WHERE id = req.entity_id;
      END IF;

      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'rejected', jsonb_build_object('comment', p_comment));

    WHEN 'return' THEN
      UPDATE public.request_steps
      SET status = 'returned', acted_at = now(), comment = p_comment
      WHERE id = current_step.id;

      UPDATE public.requests
      SET status = 'returned_for_correction', current_assignee_id = req.requester_id
      WHERE id = p_request_id;

      IF req.entity_type = 'leave_request' THEN
        UPDATE public.leave_requests
        SET status = 'pending',
            updated_at = now()
        WHERE id = req.entity_id;
      END IF;

      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'returned_for_correction', jsonb_build_object('comment', p_comment));

    WHEN 'forward' THEN
      UPDATE public.request_steps
      SET assignee_id = p_forward_to, comment = p_comment
      WHERE id = current_step.id;

      UPDATE public.requests
      SET current_assignee_id = p_forward_to
      WHERE id = p_request_id;

      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'forwarded', jsonb_build_object('forward_to', p_forward_to, 'comment', p_comment));

    WHEN 'close' THEN
      UPDATE public.requests
      SET status = 'closed', current_assignee_id = NULL, closed_at = now()
      WHERE id = p_request_id;

      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'closed', jsonb_build_object('comment', p_comment));

    WHEN 'add_comment' THEN
      INSERT INTO public.request_comments (request_id, author_id, comment, visibility)
      VALUES (p_request_id, actor_id, p_comment, p_visibility);

      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'comment_added', jsonb_build_object('comment', p_comment, 'visibility', p_visibility));
  END CASE;

  RETURN QUERY SELECT TRUE, 'Action completed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
