-- Final fix for Leave Request Smart Approval trigger
CREATE OR REPLACE FUNCTION public.create_request_for_leave_request()
RETURNS trigger AS $$
DECLARE
  v_supervisor_id UUID;
  v_hr_id UUID;
  v_request_id UUID;
  v_duration INTEGER;
  v_is_smart_eligible BOOLEAN := FALSE;
BEGIN
  -- 1. Calculate duration (end_date - start_date + 1)
  v_duration := (NEW.end_date - NEW.start_date) + 1;

  -- 2. Check eligibility for Smart Approval
  IF NEW.type IN ('sick', 'annual') AND v_duration <= 2 THEN
    v_is_smart_eligible := TRUE;
  END IF;

  -- 3. Resolve Approvers
  SELECT reporting_to INTO v_supervisor_id
  FROM profiles
  WHERE id = NEW.requester_id;

  v_hr_id := public.find_hr_assignee(NEW.property_id);

  -- 4. Insert into generic requests table
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
    CASE WHEN v_is_smart_eligible THEN NULL ELSE COALESCE(v_supervisor_id, v_hr_id) END,
    CASE WHEN v_is_smart_eligible THEN 'approved' ELSE (CASE WHEN v_supervisor_id IS NULL THEN 'pending_hr_review' ELSE 'pending_supervisor_approval' END) END,
    now(),
    jsonb_build_object(
        'property_id', NEW.property_id, 
        'department_id', NEW.department_id,
        'smart_approved', v_is_smart_eligible,
        'duration_days', v_duration
    )
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

  -- 5. Update the leave_request itself
  -- Use explicit cast to entity_status
  UPDATE leave_requests
  SET 
    workflow_request_id = v_request_id,
    status = (CASE WHEN v_is_smart_eligible THEN 'approved' ELSE 'pending' END)::entity_status,
    approved_by_id = CASE WHEN v_is_smart_eligible THEN auth.uid() ELSE NULL END
  WHERE id = NEW.id;

  -- 6. Clean up/Create steps
  DELETE FROM request_steps WHERE request_id = v_request_id;

  IF v_is_smart_eligible THEN
    INSERT INTO request_steps (request_id, step_order, assignee_id, status, acted_at, comment, created_by)
    VALUES (v_request_id, 1, NULL, 'approved', now(), 'Smart-Approved by System AI', NEW.requester_id);
  ELSE
    -- Standard workflow logic
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
  END IF;

  -- 7. Audit log
  INSERT INTO request_events (request_id, actor_id, event_type, payload)
  VALUES (v_request_id, NEW.requester_id, 'submitted', jsonb_build_object('entity_type', 'leave_request', 'smart_approved', v_is_smart_eligible));

  -- 8. Notifications
  IF v_is_smart_eligible THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.requester_id,
      'request_approved',
      'Leave Auto-Approved',
      format('Your %s leave request for %s days has been auto-approved.', NEW.type, v_duration),
      jsonb_build_object('request_id', v_request_id, 'entity_type', 'leave_request', 'entity_id', NEW.id)
    );
  ELSE
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
;
