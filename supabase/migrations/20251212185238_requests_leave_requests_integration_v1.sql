-- Integrate leave_requests into unified requests workflow

-- Find an HR assignee for a property (property_hr preferred, otherwise any regional_hr, otherwise regional_admin)
CREATE OR REPLACE FUNCTION public.find_hr_assignee(p_property_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT p.id
    INTO v_user_id
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  JOIN user_properties up ON up.user_id = p.id
  WHERE ur.role = 'property_hr'
    AND (p_property_id IS NULL OR up.property_id = p_property_id)
    AND p.is_active = true
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  SELECT p.id
    INTO v_user_id
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'regional_hr'
    AND p.is_active = true
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  SELECT p.id
    INTO v_user_id
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'regional_admin'
    AND p.is_active = true
  ORDER BY p.created_at ASC
  LIMIT 1;

  RETURN v_user_id;
END;
$$;

-- Create workflow request + initial steps when a leave_request is created.
CREATE OR REPLACE FUNCTION public.create_request_for_leave_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supervisor_id UUID;
  v_hr_id UUID;
  v_request_id UUID;
BEGIN
  -- Supervisor is taken from profiles.reporting_to
  SELECT reporting_to INTO v_supervisor_id
  FROM profiles
  WHERE id = NEW.requester_id;

  v_hr_id := public.find_hr_assignee(NEW.property_id);

  -- Create the request row (idempotent on entity_type/entity_id)
  INSERT INTO requests (
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
    v_supervisor_id,
    COALESCE(v_supervisor_id, v_hr_id),
    CASE WHEN v_supervisor_id IS NULL THEN 'pending_hr_review' ELSE 'pending_supervisor_approval' END,
    now(),
    jsonb_build_object('property_id', NEW.property_id, 'department_id', NEW.department_id)
  )
  ON CONFLICT (entity_type, entity_id)
  DO UPDATE SET
    requester_id = EXCLUDED.requester_id,
    supervisor_id = EXCLUDED.supervisor_id,
    current_assignee_id = EXCLUDED.current_assignee_id,
    status = EXCLUDED.status,
    submitted_at = EXCLUDED.submitted_at,
    metadata = EXCLUDED.metadata
  RETURNING id INTO v_request_id;

  -- Steps: supervisor first (if any), then HR (if any)
  DELETE FROM request_steps WHERE request_id = v_request_id;

  IF v_supervisor_id IS NOT NULL THEN
    INSERT INTO request_steps (request_id, step_order, assignee_id, status, created_by)
    VALUES (v_request_id, 1, v_supervisor_id, 'pending', NEW.requester_id);

    IF v_hr_id IS NOT NULL THEN
      INSERT INTO request_steps (request_id, step_order, assignee_id, status, created_by)
      VALUES (v_request_id, 2, v_hr_id, 'waiting', NEW.requester_id);
    END IF;
  ELSE
    IF v_hr_id IS NOT NULL THEN
      INSERT INTO request_steps (request_id, step_order, assignee_id, status, created_by)
      VALUES (v_request_id, 1, v_hr_id, 'pending', NEW.requester_id);
    END IF;
  END IF;

  -- Request submitted event
  INSERT INTO request_events (request_id, actor_id, event_type, payload)
  VALUES (v_request_id, NEW.requester_id, 'submitted', jsonb_build_object('entity_type', 'leave_request'));

  -- Notify current assignee
  IF COALESCE(v_supervisor_id, v_hr_id) IS NOT NULL AND COALESCE(v_supervisor_id, v_hr_id) <> NEW.requester_id THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      COALESCE(v_supervisor_id, v_hr_id),
      'approval_required',
      'Approval required',
      'A new leave request requires your approval.',
      jsonb_build_object('request_id', v_request_id, 'entity_type', 'leave_request', 'entity_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leave_requests_create_workflow_request ON leave_requests;
CREATE TRIGGER leave_requests_create_workflow_request
  AFTER INSERT ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_request_for_leave_request();

-- RPC to apply actions (approve/reject/return/forward/close/comment)
CREATE OR REPLACE FUNCTION public.request_apply_action(
  p_request_id UUID,
  p_action TEXT,
  p_comment TEXT DEFAULT NULL,
  p_forward_to UUID DEFAULT NULL,
  p_visibility TEXT DEFAULT 'all'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_current_step RECORD;
  v_next_step RECORD;
  v_actor UUID;
BEGIN
  v_actor := auth.uid();

  SELECT * INTO v_req
  FROM requests
  WHERE id = p_request_id;

  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF NOT public.can_view_request(p_request_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Load current pending step
  SELECT * INTO v_current_step
  FROM request_steps
  WHERE request_id = p_request_id AND status = 'pending'
  ORDER BY step_order ASC
  LIMIT 1;

  -- Only assignee or HR/Admin can act (except comment by viewer)
  IF p_action <> 'comment' AND p_action <> 'add_comment' THEN
    IF v_req.current_assignee_id IS DISTINCT FROM v_actor
       AND NOT public.is_hr(v_actor)
       AND NOT public.is_admin(v_actor) THEN
      RAISE EXCEPTION 'Action not allowed';
    END IF;
  END IF;

  IF p_action IN ('comment','add_comment') THEN
    INSERT INTO request_comments (request_id, author_id, comment, visibility)
    VALUES (p_request_id, v_actor, COALESCE(p_comment, ''), COALESCE(p_visibility, 'all'));
    RETURN;
  END IF;

  IF p_action = 'forward' THEN
    IF p_forward_to IS NULL THEN
      RAISE EXCEPTION 'Forward target is required';
    END IF;

    UPDATE requests
      SET current_assignee_id = p_forward_to,
          updated_at = now()
    WHERE id = p_request_id;

    IF v_current_step.id IS NOT NULL THEN
      UPDATE request_steps
        SET assignee_id = p_forward_to,
            comment = p_comment,
            acted_at = now()
      WHERE id = v_current_step.id;
    END IF;

    INSERT INTO request_events (request_id, actor_id, event_type, payload)
    VALUES (p_request_id, v_actor, 'forwarded', jsonb_build_object('to', p_forward_to));

    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      p_forward_to,
      'approval_required',
      'Approval required',
      'A request was forwarded to you.',
      jsonb_build_object('request_id', p_request_id)
    );

    RETURN;
  END IF;

  IF p_action = 'return' THEN
    -- Send back to requester
    UPDATE requests
      SET status = 'returned_for_correction',
          current_assignee_id = v_req.requester_id,
          updated_at = now()
    WHERE id = p_request_id;

    IF v_current_step.id IS NOT NULL THEN
      UPDATE request_steps
        SET status = 'returned',
            comment = p_comment,
            acted_at = now()
      WHERE id = v_current_step.id;
    END IF;

    INSERT INTO request_comments (request_id, author_id, comment, visibility)
    VALUES (p_request_id, v_actor, COALESCE(p_comment, ''), 'all');

    INSERT INTO request_events (request_id, actor_id, event_type, payload)
    VALUES (p_request_id, v_actor, 'returned_for_correction', jsonb_build_object());

    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      v_req.requester_id,
      'request_returned',
      'Request returned',
      'Your request was returned for correction.',
      jsonb_build_object('request_id', p_request_id)
    );

    RETURN;
  END IF;

  IF p_action = 'reject' THEN
    UPDATE requests
      SET status = 'rejected',
          current_assignee_id = NULL,
          closed_at = now(),
          updated_at = now()
    WHERE id = p_request_id;

    IF v_current_step.id IS NOT NULL THEN
      UPDATE request_steps
        SET status = 'rejected',
            comment = p_comment,
            acted_at = now()
      WHERE id = v_current_step.id;
    END IF;

    INSERT INTO request_comments (request_id, author_id, comment, visibility)
    VALUES (p_request_id, v_actor, COALESCE(p_comment, ''), 'all');

    INSERT INTO request_events (request_id, actor_id, event_type, payload)
    VALUES (p_request_id, v_actor, 'rejected', jsonb_build_object());

    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      v_req.requester_id,
      'request_rejected',
      'Request rejected',
      'Your request was rejected.',
      jsonb_build_object('request_id', p_request_id)
    );

    -- Keep leave_requests in sync (only for leave_request entity)
    IF v_req.entity_type = 'leave_request' THEN
      UPDATE leave_requests
        SET status = 'rejected',
            rejected_by_id = v_actor,
            rejection_reason = p_comment,
            updated_at = now()
      WHERE id = v_req.entity_id;
    END IF;

    RETURN;
  END IF;

  IF p_action = 'approve' THEN
    IF v_current_step.id IS NOT NULL THEN
      UPDATE request_steps
        SET status = 'approved',
            comment = p_comment,
            acted_at = now()
      WHERE id = v_current_step.id;
    END IF;

    -- Next waiting step becomes pending
    SELECT * INTO v_next_step
    FROM request_steps
    WHERE request_id = p_request_id AND status = 'waiting'
    ORDER BY step_order ASC
    LIMIT 1;

    IF v_next_step.id IS NOT NULL THEN
      UPDATE request_steps SET status = 'pending' WHERE id = v_next_step.id;

      UPDATE requests
        SET current_assignee_id = v_next_step.assignee_id,
            status = 'pending_hr_review',
            updated_at = now()
      WHERE id = p_request_id;

      INSERT INTO request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, v_actor, 'approved', jsonb_build_object('next_assignee', v_next_step.assignee_id));

      IF v_next_step.assignee_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (
          v_next_step.assignee_id,
          'approval_required',
          'Approval required',
          'A request is pending your approval.',
          jsonb_build_object('request_id', p_request_id)
        );
      END IF;

      RETURN;
    END IF;

    -- No more steps: approved
    UPDATE requests
      SET status = 'approved',
          current_assignee_id = NULL,
          updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO request_events (request_id, actor_id, event_type, payload)
    VALUES (p_request_id, v_actor, 'approved', jsonb_build_object('final', true));

    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      v_req.requester_id,
      'request_approved',
      'Request approved',
      'Your request was approved.',
      jsonb_build_object('request_id', p_request_id)
    );

    -- Keep leave_requests in sync
    IF v_req.entity_type = 'leave_request' THEN
      UPDATE leave_requests
        SET status = 'approved',
            approved_by_id = v_actor,
            updated_at = now()
      WHERE id = v_req.entity_id;
    END IF;

    RETURN;
  END IF;

  IF p_action = 'close' THEN
    IF NOT public.is_hr(v_actor) AND NOT public.is_admin(v_actor) THEN
      RAISE EXCEPTION 'Close not allowed';
    END IF;

    UPDATE requests
      SET status = 'closed',
          closed_at = now(),
          current_assignee_id = NULL,
          updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO request_events (request_id, actor_id, event_type, payload)
    VALUES (p_request_id, v_actor, 'closed', jsonb_build_object());

    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      v_req.requester_id,
      'request_closed',
      'Request closed',
      'Your request was closed.',
      jsonb_build_object('request_id', p_request_id)
    );

    RETURN;
  END IF;

  RAISE EXCEPTION 'Unknown action %', p_action;
END;
$$;
;
