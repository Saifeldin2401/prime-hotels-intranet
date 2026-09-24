-- CRITICAL: submit_promotion_request(employee_id, new_role, ...) can be called by ANY user
-- who passes is_hr_or_admin() (i.e. property_hr and above) with NO check that new_role is
-- below their own hierarchy level. Worse, its INSERT into employee_promotions (with
-- effective_date defaulting to current_date) immediately fires the AFTER INSERT trigger
-- auto_apply_promotion -> apply_promotion(), which grants new.to_role to new.employee_id with
-- only an enum-membership check -- no hierarchy check at all. Net effect: a property_hr calling
-- submit_promotion_request(employee_id => self, new_role => 'corporate_admin') is granted
-- corporate_admin instantly, on submission, with no approval step ever required. This is the
-- same escalation class already fixed on user_roles directly, reachable here via a completely
-- separate table/trigger that was never covered.
--
-- Two gates are fixed:
-- 1. apply_promotion(): the trigger itself now refuses to grant a role at or above the
--    priority of the session that caused the row (auth.uid(), captured live at INSERT time --
--    this covers promote_employee's already-checked path harmlessly, and blocks both direct
--    table inserts and submit_promotion_request's unchecked path).
-- 2. request_apply_action(): the 'approve' branch now separately validates, for
--    entity_type = 'promotion', that the approving actor's hierarchy allows granting the
--    target to_role -- closing the future-dated promotion path where the trigger doesn't fire
--    until process_due_promotions() applies it later, after approval. Also tightened 'close' to
--    require the requester, current assignee, or HR/admin (previously any viewer could close
--    any request).
--
-- process_due_promotions/process_due_transfers are also de-scoped from `authenticated` --
-- they're cron-only internals with no per-caller authorization of their own (they apply
-- whatever is already approved+due, company-wide), so any signed-in user being able to trigger
-- them on demand serves no legitimate purpose and only helps an attacker force-apply a
-- (now-blocked) escalation attempt without waiting for the cron schedule.
--
-- Verified live: a regional_admin inserting a promotion granting themselves corporate_admin now
-- raises "Not authorized to grant role corporate_admin: it is at or above your own privilege
-- level"; the same admin promoting a property_manager to department_head still applies
-- correctly.

CREATE OR REPLACE FUNCTION public.apply_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if new.effective_date <= current_date then
    if new.to_role is not null and new.to_role <> new.from_role then
      if exists (
        select 1
        from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
          and t.typname = 'app_role'
          and e.enumlabel = new.to_role
      ) then
        if public.get_role_priority(new.to_role::public.app_role) <= public.get_user_role_priority(auth.uid()) then
          raise exception 'Not authorized to grant role %: it is at or above your own privilege level', new.to_role;
        end if;

        delete from public.user_roles where user_id = new.employee_id;
        insert into public.user_roles (user_id, role)
        values (new.employee_id, new.to_role::public.app_role)
        on conflict (user_id, role) do nothing;
      end if;
    end if;

    if new.to_department_id is not null and new.to_department_id <> new.from_department_id then
      delete from public.user_departments where user_id = new.employee_id;
      insert into public.user_departments (user_id, department_id)
      values (new.employee_id, new.to_department_id)
      on conflict (user_id, department_id) do nothing;
    end if;
  end if;
  return new;
end;
$function$;

DROP FUNCTION IF EXISTS public.request_apply_action(uuid, text, text, uuid, text);
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
SET search_path TO 'public'
AS $function$
declare
  req record;
  current_step record;
  next_step record;
  actor_id uuid := auth.uid();
  has_comment boolean := p_comment is not null and length(trim(p_comment)) > 0;
  v_promo_to_role text;
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

REVOKE EXECUTE ON FUNCTION public.request_apply_action(uuid, text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_apply_action(uuid, text, text, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_due_promotions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_due_transfers() FROM authenticated;
