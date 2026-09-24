-- expense_claims had three separate problems, all re-verified live before
-- writing this migration:
--
-- 1. No SELECT policy let a requester see their own claims at all (only
--    is_hr_or_admin could SELECT) - useMyExpenseClaims() queries the table
--    directly filtered by requester_id, so "My Expense Claims" was silently
--    returning nothing for every non-HR/admin user.
-- 2. The self UPDATE/DELETE policies had no status guard, so a requester
--    could directly set their own claim's status/approved_by_id/approved_at
--    (or rejected_*), self-approving a reimbursement regardless of where the
--    real approval workflow (requests/request_steps) actually stood.
-- 3. request_apply_action() (the real approval workflow engine) has a sync
--    branch for entity_type='leave_request' but none for 'expense_claim' -
--    approving/rejecting an expense claim through the workflow never touched
--    expense_claims.status at all, so every claim stayed 'pending' forever
--    regardless of its real outcome (confirmed against submit_expense_claim,
--    which always inserts with status='pending').

DROP POLICY IF EXISTS users_own_expense_claims_select ON public.expense_claims;
CREATE POLICY users_own_expense_claims_select ON public.expense_claims
  FOR SELECT USING (
    (requester_id = (SELECT auth.uid())) OR is_hr_or_admin((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS users_own_expense_claims_update ON public.expense_claims;
CREATE POLICY users_own_expense_claims_update ON public.expense_claims
  FOR UPDATE
  USING ((requester_id = (SELECT auth.uid())) AND status = 'pending')
  WITH CHECK ((requester_id = (SELECT auth.uid())) AND status = 'pending');

DROP POLICY IF EXISTS users_own_expense_claims_delete ON public.expense_claims;
CREATE POLICY users_own_expense_claims_delete ON public.expense_claims
  FOR DELETE USING ((requester_id = (SELECT auth.uid())) AND status = 'pending');

-- Even while pending, the workflow-owned outcome columns are only ever
-- written by request_apply_action (SECURITY DEFINER, unaffected by this).
REVOKE UPDATE (
  status, approved_by_id, approved_at, rejected_by_id, rejected_at,
  rejection_reason, paid_at, workflow_request_id
) ON public.expense_claims FROM authenticated;

CREATE OR REPLACE FUNCTION public.request_apply_action(p_request_id uuid, p_action text, p_comment text DEFAULT NULL::text, p_forward_to uuid DEFAULT NULL::uuid, p_visibility text DEFAULT 'all'::text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  req record;
  current_step record;
  next_step record;
  actor_id uuid := auth.uid();
  has_comment boolean := p_comment is not null and length(trim(p_comment)) > 0;
  v_promo_to_role text;
  v_updated_rows int;
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

  if p_action in ('approve', 'reject', 'return', 'forward')
     and current_step.assignee_id is distinct from actor_id
     and not public.is_hr(actor_id)
     and not public.is_admin(actor_id) then
    return query select false, 'Access denied: only the assigned approver may act on this step';
    return;
  end if;

  -- An actor can never act on their own request via approve/reject/return/forward, regardless
  -- of role (assignee, HR, or admin). Holding HR/admin bypasses the assignee check above, but
  -- must never let someone approve their own leave request, promotion, transfer, etc.
  if p_action in ('approve', 'reject', 'return', 'forward')
     and req.requester_id = actor_id then
    return query select false, 'Access denied: you cannot act on your own request';
    return;
  end if;

  -- Promotions can grant roles: approving one must not let the approver hand out a role at or
  -- above their own hierarchy level, regardless of whether they're an assigned HR approver.
  if p_action = 'approve' and req.entity_type = 'promotion' then
    select ep.to_role into v_promo_to_role from public.employee_promotions ep where ep.id = req.entity_id;
    if v_promo_to_role is not null and v_promo_to_role in (select unnest(enum_range(null::public.app_role))::text) then
      if public.get_role_priority(v_promo_to_role::public.app_role) <= public.get_user_role_priority(actor_id) then
        return query select false, 'Not authorized to approve a promotion to this role';
        return;
      end if;
    end if;
  end if;

  case p_action
    when 'approve' then
      -- Re-check status='pending' in the same UPDATE that transitions the step: if a concurrent
      -- call already processed this step between the SELECT above and here, this affects 0 rows
      -- and we bail instead of both calls racing through the rest of the branch.
      update public.request_steps
      set status = 'approved', acted_at = now(), comment = p_comment
      where id = current_step.id and status = 'pending';

      get diagnostics v_updated_rows = row_count;
      if v_updated_rows = 0 then
        return query select false, 'This step was already processed';
        return;
      end if;

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
        elsif req.entity_type = 'expense_claim' then
          update public.expense_claims
          set status = 'approved',
              approved_by_id = actor_id,
              approved_at = now(),
              updated_at = now()
          where id = req.entity_id;
        end if;
      end if;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'approved', jsonb_build_object('comment', p_comment));

    when 'reject' then
      update public.request_steps
      set status = 'rejected', acted_at = now(), comment = p_comment
      where id = current_step.id and status = 'pending';

      get diagnostics v_updated_rows = row_count;
      if v_updated_rows = 0 then
        return query select false, 'This step was already processed';
        return;
      end if;

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
      elsif req.entity_type = 'expense_claim' then
        update public.expense_claims
        set status = 'rejected',
            rejected_by_id = actor_id,
            rejected_at = now(),
            rejection_reason = p_comment,
            updated_at = now()
        where id = req.entity_id;
      end if;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'rejected', jsonb_build_object('comment', p_comment));

    when 'return' then
      update public.request_steps
      set status = 'returned', acted_at = now(), comment = p_comment
      where id = current_step.id and status = 'pending';

      get diagnostics v_updated_rows = row_count;
      if v_updated_rows = 0 then
        return query select false, 'This step was already processed';
        return;
      end if;

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
      elsif req.entity_type = 'expense_claim' then
        update public.expense_claims
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
      if req.requester_id is distinct from actor_id
         and req.current_assignee_id is distinct from actor_id
         and not public.is_hr(actor_id)
         and not public.is_admin(actor_id) then
        return query select false, 'Access denied: only the requester, current assignee, or HR/admin may close this request';
        return;
      end if;

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
