-- Phase 1: Request SLA policies, due date automation, and escalation

-- SLA policies for request workflows
CREATE TABLE IF NOT EXISTS public.request_sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  step_role public.app_role,
  sla_hours integer,
  default_priority text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sla_hours IS NULL OR sla_hours > 0),
  CHECK (default_priority IS NULL OR default_priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_request_sla_policies_entity_role
  ON public.request_sla_policies(entity_type, step_role);

CREATE UNIQUE INDEX IF NOT EXISTS uq_request_sla_policies_active_role
  ON public.request_sla_policies(entity_type, step_role)
  WHERE is_active AND step_role IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_request_sla_policies_active_request
  ON public.request_sla_policies(entity_type)
  WHERE is_active AND step_role IS NULL;

DROP TRIGGER IF EXISTS update_request_sla_policies_updated_at ON public.request_sla_policies;
CREATE TRIGGER update_request_sla_policies_updated_at
  BEFORE UPDATE ON public.request_sla_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.request_sla_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS request_sla_policies_select ON public.request_sla_policies;
DROP POLICY IF EXISTS request_sla_policies_manage ON public.request_sla_policies;

CREATE POLICY request_sla_policies_select
  ON public.request_sla_policies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY request_sla_policies_manage
  ON public.request_sla_policies FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr')
  );

-- Default priority from SLA policy (entity-level)
CREATE OR REPLACE FUNCTION public.apply_request_priority_default()
RETURNS TRIGGER AS $$
DECLARE
  v_priority text;
BEGIN
  IF NEW.priority IS NULL THEN
    NEW.priority := 'normal';
  END IF;

  SELECT p.default_priority INTO v_priority
  FROM public.request_sla_policies p
  WHERE p.is_active = true
    AND p.entity_type = NEW.entity_type
    AND p.step_role IS NULL
    AND p.default_priority IS NOT NULL
  ORDER BY p.created_at DESC
  LIMIT 1;

  IF v_priority IS NOT NULL THEN
    NEW.priority := v_priority;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS request_priority_default_trigger ON public.requests;
CREATE TRIGGER request_priority_default_trigger
  BEFORE INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_request_priority_default();

-- Apply SLA to pending steps and set due_at if missing
CREATE OR REPLACE FUNCTION public.apply_request_step_sla()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type text;
  v_sla_hours integer;
BEGIN
  IF NEW.status = 'pending' AND NEW.due_at IS NULL THEN
    SELECT r.entity_type INTO v_entity_type
    FROM public.requests r
    WHERE r.id = NEW.request_id;

    IF NEW.sla_hours IS NULL THEN
      SELECT p.sla_hours INTO v_sla_hours
      FROM public.request_sla_policies p
      WHERE p.is_active = true
        AND p.entity_type = v_entity_type
        AND (p.step_role = NEW.assignee_role OR p.step_role IS NULL)
        AND p.sla_hours IS NOT NULL
      ORDER BY (p.step_role IS NULL) ASC, p.created_at DESC
      LIMIT 1;

      NEW.sla_hours := v_sla_hours;
    END IF;

    IF NEW.sla_hours IS NOT NULL THEN
      NEW.due_at := now() + make_interval(hours => NEW.sla_hours);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS request_step_sla_trigger ON public.request_steps;
CREATE TRIGGER request_step_sla_trigger
  BEFORE INSERT OR UPDATE OF status, due_at, sla_hours ON public.request_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_request_step_sla();

-- Sync request due_at with current pending step
CREATE OR REPLACE FUNCTION public.sync_request_due_at()
RETURNS TRIGGER AS $$
DECLARE
  v_next_due timestamptz;
BEGIN
  IF NEW.status = 'pending' THEN
    UPDATE public.requests
    SET due_at = NEW.due_at
    WHERE id = NEW.request_id;
  ELSIF OLD.status = 'pending' AND NEW.status <> 'pending' THEN
    SELECT rs.due_at INTO v_next_due
    FROM public.request_steps rs
    WHERE rs.request_id = NEW.request_id
      AND rs.status = 'pending'
    ORDER BY rs.step_order
    LIMIT 1;

    UPDATE public.requests
    SET due_at = v_next_due
    WHERE id = NEW.request_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS request_due_at_sync_trigger ON public.request_steps;
CREATE TRIGGER request_due_at_sync_trigger
  AFTER INSERT OR UPDATE OF status, due_at ON public.request_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_request_due_at();

-- Escalate overdue requests based on escalation_rules
CREATE OR REPLACE FUNCTION public.check_and_escalate_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_step RECORD;
  rule RECORD;
  hours_pending integer;
  next_assignee_id uuid;
  new_due_at timestamptz;
BEGIN
  FOR pending_step IN
    SELECT rs.*, r.entity_type, r.request_no, r.current_assignee_id, r.property_id, r.last_action_at, r.submitted_at, r.created_at
    FROM public.request_steps rs
    JOIN public.requests r ON r.id = rs.request_id
    WHERE rs.status = 'pending'
      AND (
        (rs.due_at IS NOT NULL AND rs.due_at < now()) OR
        (rs.due_at IS NULL AND (r.last_action_at IS NOT NULL OR r.submitted_at IS NOT NULL))
      )
      AND (rs.escalated_at IS NULL OR rs.escalated_at < now() - interval '1 hour')
  LOOP
    SELECT * INTO rule
    FROM public.escalation_rules er
    WHERE er.is_active = true
      AND er.action_type = pending_step.entity_type
    ORDER BY er.threshold_hours ASC
    LIMIT 1;

    IF rule IS NULL THEN
      CONTINUE;
    END IF;

    IF pending_step.due_at IS NULL THEN
      hours_pending := EXTRACT(EPOCH FROM (now() - COALESCE(pending_step.last_action_at, pending_step.submitted_at, pending_step.created_at))) / 3600;
      IF hours_pending < rule.threshold_hours THEN
        CONTINUE;
      END IF;
    END IF;

    -- Find next assignee by role, scoped by property when possible
    SELECT p.id INTO next_assignee_id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    LEFT JOIN public.user_properties up ON up.user_id = p.id
    WHERE ur.role = rule.next_role
      AND p.is_active = true
      AND (
        pending_step.property_id IS NULL OR
        ur.role IN ('regional_admin', 'regional_hr', 'corporate_admin') OR
        up.property_id = pending_step.property_id
      )
    ORDER BY (up.property_id = pending_step.property_id) DESC, p.created_at
    LIMIT 1;

    IF next_assignee_id IS NULL OR next_assignee_id = pending_step.assignee_id THEN
      CONTINUE;
    END IF;

    new_due_at := now() + make_interval(hours => COALESCE(pending_step.sla_hours, rule.threshold_hours));

    UPDATE public.request_steps
    SET assignee_id = next_assignee_id,
        escalated_at = now(),
        due_at = new_due_at
    WHERE id = pending_step.id;

    UPDATE public.requests
    SET current_assignee_id = next_assignee_id,
        last_action_at = now(),
        due_at = new_due_at
    WHERE id = pending_step.request_id;

    INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
    VALUES (
      pending_step.request_id,
      NULL,
      'forwarded',
      jsonb_build_object(
        'escalated', true,
        'old_assignee_id', pending_step.assignee_id,
        'new_assignee_id', next_assignee_id,
        'rule_id', rule.id,
        'hours_pending', hours_pending
      )
    );

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (
      NULL,
      'escalate',
      pending_step.entity_type,
      pending_step.request_id,
      jsonb_build_object(
        'old_assignee_id', pending_step.assignee_id,
        'new_assignee_id', next_assignee_id,
        'rule_id', rule.id
      )
    );

    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
      next_assignee_id,
      'escalation_alert',
      'Request Escalated',
      format('Request #%s has been escalated to you.', pending_step.request_no),
      jsonb_build_object('request_id', pending_step.request_id, 'entity_type', pending_step.entity_type)
    );

    IF pending_step.assignee_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      VALUES (
        pending_step.assignee_id,
        'escalation_alert',
        'Request Escalated',
        format('Request #%s has been escalated to another approver.', pending_step.request_no),
        jsonb_build_object('request_id', pending_step.request_id, 'entity_type', pending_step.entity_type)
      );
    END IF;
  END LOOP;
END;
$$;

-- Schedule escalation check (enable if pg_cron is available)
-- SELECT cron.schedule('check-request-escalations', '0 * * * *', 'SELECT public.check_and_escalate_requests();');

-- Merge request_apply_action logic with SLA/last_action tracking
CREATE OR REPLACE FUNCTION public.request_apply_action(
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
  has_comment BOOLEAN := p_comment IS NOT NULL AND length(trim(p_comment)) > 0;
BEGIN
  -- Get request and validate access
  SELECT * INTO req FROM public.requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Request not found';
    RETURN;
  END IF;

  IF NOT public.can_view_request(actor_id, p_request_id) THEN
    RETURN QUERY SELECT FALSE, 'Access denied';
    RETURN;
  END IF;

  -- Comment required for reject/return
  IF p_action IN ('reject', 'return') AND NOT has_comment THEN
    RETURN QUERY SELECT FALSE, 'Comment is required for this action';
    RETURN;
  END IF;

  -- Get current step (for actions that require a pending step)
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
            last_action_at = now(),
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
        SET status = 'approved',
            current_assignee_id = NULL,
            closed_at = now(),
            due_at = NULL,
            last_action_at = now()
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
      SET status = 'rejected',
          current_assignee_id = NULL,
          closed_at = now(),
          due_at = NULL,
          last_action_at = now()
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
      SET status = 'returned_for_correction',
          current_assignee_id = req.requester_id,
          due_at = NULL,
          last_action_at = now()
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
      SET assignee_id = p_forward_to,
          comment = p_comment,
          due_at = CASE
            WHEN current_step.sla_hours IS NOT NULL THEN now() + make_interval(hours => current_step.sla_hours)
            ELSE current_step.due_at
          END
      WHERE id = current_step.id;

      UPDATE public.requests
      SET current_assignee_id = p_forward_to,
          last_action_at = now()
      WHERE id = p_request_id;

      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'forwarded', jsonb_build_object('forward_to', p_forward_to, 'comment', p_comment));

    WHEN 'close' THEN
      UPDATE public.requests
      SET status = 'closed',
          current_assignee_id = NULL,
          closed_at = now(),
          due_at = NULL,
          last_action_at = now()
      WHERE id = p_request_id;

      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'closed', jsonb_build_object('comment', p_comment));

    WHEN 'add_comment' THEN
      INSERT INTO public.request_comments (request_id, author_id, comment, visibility)
      VALUES (p_request_id, actor_id, p_comment, p_visibility);

      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'comment_added', jsonb_build_object('comment', p_comment, 'visibility', p_visibility));

      UPDATE public.requests
      SET last_action_at = now()
      WHERE id = p_request_id;
  END CASE;

  -- For action-based comments, capture them in the comment feed as well.
  IF p_action <> 'add_comment' AND has_comment THEN
    INSERT INTO public.request_comments (request_id, author_id, comment, visibility)
    VALUES (p_request_id, actor_id, p_comment, p_visibility);
  END IF;

  RETURN QUERY SELECT TRUE, 'Action completed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
