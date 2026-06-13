-- Fix request workflow branching and promotion finalization status transition.
-- 1) request_apply_action: composite-record NULL checks were incorrect for `next_step`
--    and caused premature request approval while later steps still existed.
-- 2) process_request_finalization: attempted to set promotions.status='approved',
--    which violates promotions_status_check and broke promotion approvals.

CREATE OR REPLACE FUNCTION public.request_apply_action(
  p_request_id uuid,
  p_action text,
  p_comment text DEFAULT NULL::text,
  p_forward_to uuid DEFAULT NULL::uuid,
  p_visibility text DEFAULT 'all'::text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  req record;
  current_step record;
  next_step record;
  actor_id uuid := auth.uid();
  has_comment boolean := p_comment is not null and length(trim(p_comment)) > 0;
begin
  if actor_id is null then
    return query select false, 'Not authenticated';
    return;
  end if;

  select * into req from public.requests where id = p_request_id;
  if not found then
    return query select false, 'Request not found';
    return;
  end if;

  if not public.can_view_request(p_request_id) then
    return query select false, 'Access denied';
    return;
  end if;

  if p_action in ('reject', 'return') and not has_comment then
    return query select false, 'Comment is required for this action';
    return;
  end if;

  select * into current_step from public.request_steps
  where request_id = p_request_id and status = 'pending'
  order by step_order limit 1;

  if current_step.id is null and p_action in ('approve', 'reject', 'return', 'forward') then
    return query select false, 'No pending step found';
    return;
  end if;

  case p_action
    when 'approve' then
      update public.request_steps
      set status = 'approved', acted_at = now(), comment = p_comment
      where id = current_step.id;

      select * into next_step from public.request_steps
      where request_id = p_request_id and step_order > current_step.step_order and status = 'waiting'
      order by step_order limit 1;

      if next_step.id is not null then
        update public.request_steps
        set status = 'pending', assignee_id = next_step.assignee_id
        where id = next_step.id;

        update public.requests
        set status = 'pending_hr_review',
            current_assignee_id = next_step.assignee_id,
            last_action_at = now(),
            metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{routing_warning,missing_hr_assignee}', to_jsonb(next_step.assignee_id is null), true)
        where id = p_request_id;

        if next_step.assignee_id is null then
          insert into public.notifications (user_id, type, title, message, metadata)
          select ur.user_id,
                 'escalation_alert'::public.notification_type,
                 'Routing issue: Missing HR assignee',
                 format('Request #%s has no HR assignee.', req.request_no),
                 jsonb_build_object('request_id', req.id, 'entity_type', req.entity_type, 'reason', 'missing_hr_assignee')
          from public.user_roles ur
          where ur.role in ('regional_admin', 'regional_hr', 'corporate_admin');
        end if;
      else
        update public.requests
        set status = 'approved',
            current_assignee_id = null,
            closed_at = now(),
            due_at = null,
            last_action_at = now()
        where id = p_request_id;

        if req.entity_type = 'leave_request' then
          update public.leave_requests
          set status = 'approved',
              approved_by_id = actor_id,
              updated_at = now()
          where id = req.entity_id;
        end if;
      end if;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'approved', jsonb_build_object('comment', p_comment));

    when 'reject' then
      update public.request_steps
      set status = 'rejected', acted_at = now(), comment = p_comment
      where id = current_step.id;

      update public.requests
      set status = 'rejected',
          current_assignee_id = null,
          closed_at = now(),
          due_at = null,
          last_action_at = now()
      where id = p_request_id;

      if req.entity_type = 'leave_request' then
        update public.leave_requests
        set status = 'rejected',
            rejected_by_id = actor_id,
            rejection_reason = p_comment,
            updated_at = now()
        where id = req.entity_id;
      end if;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'rejected', jsonb_build_object('comment', p_comment));

    when 'return' then
      update public.request_steps
      set status = 'returned', acted_at = now(), comment = p_comment
      where id = current_step.id;

      update public.requests
      set status = 'returned_for_correction',
          current_assignee_id = req.requester_id,
          due_at = null,
          last_action_at = now()
      where id = p_request_id;

      if req.entity_type = 'leave_request' then
        update public.leave_requests
        set status = 'pending',
            updated_at = now()
        where id = req.entity_id;
      end if;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'returned_for_correction', jsonb_build_object('comment', p_comment));

    when 'forward' then
      update public.request_steps
      set assignee_id = p_forward_to,
          comment = p_comment,
          due_at = case
            when current_step.sla_hours is not null then now() + make_interval(hours => current_step.sla_hours)
            else current_step.due_at
          end
      where id = current_step.id;

      update public.requests
      set current_assignee_id = p_forward_to,
          last_action_at = now()
      where id = p_request_id;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'forwarded', jsonb_build_object('forward_to', p_forward_to, 'comment', p_comment));

    when 'close' then
      update public.requests
      set status = 'closed',
          current_assignee_id = null,
          closed_at = now(),
          due_at = null,
          last_action_at = now()
      where id = p_request_id;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'closed', jsonb_build_object('comment', p_comment));

    when 'add_comment' then
      insert into public.request_comments (request_id, author_id, comment, visibility)
      values (p_request_id, actor_id, p_comment, p_visibility);

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'comment_added', jsonb_build_object('comment', p_comment, 'visibility', p_visibility));

      update public.requests
      set last_action_at = now()
      where id = p_request_id;
  end case;

  if p_action <> 'add_comment' and has_comment then
    insert into public.request_comments (request_id, author_id, comment, visibility)
    values (p_request_id, actor_id, p_comment, p_visibility);
  end if;

  return query select true, 'Action completed successfully';
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_request_finalization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_promo_id UUID;
    v_transfer_id UUID;
BEGIN
    -- Only act when request is APPROVED.
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN

        -- Promotion records are created as 'pending'. Keep them in that valid
        -- state, then immediately process if the effective date is due.
        IF NEW.entity_type = 'promotion' THEN
            SELECT id INTO v_promo_id
            FROM public.promotions
            WHERE id = NEW.entity_id;

            IF v_promo_id IS NOT NULL THEN
              UPDATE public.promotions
              SET status = 'pending',
                  updated_at = now()
              WHERE id = v_promo_id
                AND status <> 'cancelled';

              PERFORM public.process_due_promotions();
            END IF;
        END IF;

        -- Handle Transfer
        IF NEW.entity_type = 'transfer' THEN
            SELECT id INTO v_transfer_id
            FROM public.transfers
            WHERE id = NEW.entity_id;

            IF v_transfer_id IS NOT NULL THEN
              UPDATE public.transfers
              SET status = 'approved'
              WHERE id = v_transfer_id;

              PERFORM public.process_due_transfers();
            END IF;
        END IF;

    END IF;
    RETURN NEW;
END;
$function$;
