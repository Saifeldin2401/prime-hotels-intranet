-- Function to check and escalate pending approvals
CREATE OR REPLACE FUNCTION public.check_and_escalate_approvals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_request RECORD;
  escalation_rule RECORD;
  hours_pending INTEGER;
  next_approver_id UUID;
BEGIN
  -- Loop through all pending approval requests
  FOR pending_request IN
    SELECT ar.*, er.threshold_hours, er.next_role
    FROM approval_requests ar
    LEFT JOIN escalation_rules er ON er.action_type = ar.entity_type AND er.is_active = true
    WHERE ar.status = 'pending'
    AND ar.created_at < now() - INTERVAL '1 hour' -- Only check requests older than 1 hour
  LOOP
    -- Calculate hours pending
    hours_pending := EXTRACT(EPOCH FROM (now() - pending_request.created_at)) / 3600;
    
    -- Check if escalation rule exists and threshold exceeded
    IF pending_request.threshold_hours IS NOT NULL AND hours_pending >= pending_request.threshold_hours THEN
      -- Find next approver based on role
      SELECT id INTO next_approver_id
      FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE ur.role = pending_request.next_role
      AND p.is_active = true
      LIMIT 1;
      
      -- If next approver found, escalate
      IF next_approver_id IS NOT NULL THEN
        -- Update approval request
        UPDATE approval_requests
        SET current_approver_id = next_approver_id,
            updated_at = now()
        WHERE id = pending_request.id;
        
        -- Log escalation in audit
        INSERT INTO audit_logs (
          user_id,
          action,
          entity_type,
          entity_id,
          new_values
        )
        VALUES (
          NULL, -- System action
          'escalate',
          pending_request.entity_type,
          pending_request.entity_id,
          jsonb_build_object(
            'old_approver_id', pending_request.current_approver_id,
            'new_approver_id', next_approver_id,
            'hours_pending', hours_pending
          )
        );
        
        -- Create notification for new approver
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata
        )
        VALUES (
          next_approver_id,
          'escalation_alert',
          'Approval Escalated',
          'An approval request has been escalated to you after ' || hours_pending || ' hours.',
          jsonb_build_object(
            'entity_type', pending_request.entity_type,
            'entity_id', pending_request.entity_id,
            'approval_request_id', pending_request.id
          )
        );
        
        -- Notify original approver
        IF pending_request.current_approver_id IS NOT NULL THEN
          INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            metadata
          )
          VALUES (
            pending_request.current_approver_id,
            'escalation_alert',
            'Approval Escalated',
            'An approval request has been escalated due to inactivity.',
            jsonb_build_object(
              'entity_type', pending_request.entity_type,
              'entity_id', pending_request.entity_id
            )
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Schedule escalation check (uncomment if pg_cron is enabled)
-- SELECT cron.schedule('check-escalations', '0 * * * *', 'SELECT public.check_and_escalate_approvals()');

