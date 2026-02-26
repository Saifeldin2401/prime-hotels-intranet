-- Phase 1: Request governance controls (priority, due dates, last action tracking)

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_action_at timestamptz;

ALTER TABLE public.request_steps
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_hours integer,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_requests_due_at ON public.requests(due_at);
CREATE INDEX IF NOT EXISTS idx_request_steps_due_at ON public.request_steps(due_at);

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
  
  -- Get current step
  SELECT * INTO current_step FROM public.request_steps 
  WHERE request_id = p_request_id AND status = 'pending' 
  ORDER BY step_order LIMIT 1;
  
  CASE p_action
    WHEN 'approve' THEN
      -- Update current step
      UPDATE public.request_steps 
      SET status = 'approved', acted_at = now(), comment = p_comment
      WHERE id = current_step.id;
      
      -- Find next step
      SELECT * INTO next_step FROM public.request_steps 
      WHERE request_id = p_request_id AND step_order > current_step.step_order AND status = 'waiting'
      ORDER BY step_order LIMIT 1;
      
      IF next_step IS NOT NULL THEN
        -- Activate next step
        UPDATE public.request_steps 
        SET status = 'pending', assignee_id = next_step.assignee_id
        WHERE id = next_step.id;
        
        -- Update request status and assignee
        UPDATE public.requests 
        SET status = 'pending_hr_review',
            current_assignee_id = next_step.assignee_id,
            last_action_at = now()
        WHERE id = p_request_id;
      ELSE
        -- No more steps, approve the request
        UPDATE public.requests 
        SET status = 'approved',
            current_assignee_id = NULL,
            closed_at = now(),
            last_action_at = now()
        WHERE id = p_request_id;
      END IF;
      
      -- Log event
      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'approved', jsonb_build_object('comment', p_comment));
      
    WHEN 'reject' THEN
      -- Reject the request
      UPDATE public.request_steps 
      SET status = 'rejected', acted_at = now(), comment = p_comment
      WHERE id = current_step.id;
      
      UPDATE public.requests 
      SET status = 'rejected',
          current_assignee_id = NULL,
          closed_at = now(),
          last_action_at = now()
      WHERE id = p_request_id;
      
      -- Log event
      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'rejected', jsonb_build_object('comment', p_comment));
      
    WHEN 'return' THEN
      -- Return for correction
      UPDATE public.request_steps 
      SET status = 'returned', acted_at = now(), comment = p_comment
      WHERE id = current_step.id;
      
      UPDATE public.requests 
      SET status = 'returned_for_correction',
          current_assignee_id = req.requester_id,
          last_action_at = now()
      WHERE id = p_request_id;
      
      -- Log event
      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'returned_for_correction', jsonb_build_object('comment', p_comment));
      
    WHEN 'forward' THEN
      -- Forward to different person
      UPDATE public.request_steps 
      SET assignee_id = p_forward_to, comment = p_comment
      WHERE id = current_step.id;
      
      UPDATE public.requests 
      SET current_assignee_id = p_forward_to,
          last_action_at = now()
      WHERE id = p_request_id;
      
      -- Log event
      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'forwarded', jsonb_build_object('forward_to', p_forward_to, 'comment', p_comment));
      
    WHEN 'close' THEN
      -- Close the request
      UPDATE public.requests 
      SET status = 'closed',
          current_assignee_id = NULL,
          closed_at = now(),
          last_action_at = now()
      WHERE id = p_request_id;
      
      -- Log event
      INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'closed', jsonb_build_object('comment', p_comment));
      
    WHEN 'add_comment' THEN
      -- Add comment
      INSERT INTO public.request_comments (request_id, author_id, comment, visibility)
      VALUES (p_request_id, actor_id, p_comment, p_visibility);
      
      -- Log event
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
$$ LANGUAGE plpgsql SECURITY DEFINER;;
