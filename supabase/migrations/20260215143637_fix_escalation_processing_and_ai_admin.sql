create or replace function public.ai_admin_execute(
  p_action text,
  p_proposal_id uuid default null::uuid,
  p_optimizer_body jsonb default null::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'net', 'vault'
as $$
declare
  v_uid uuid := auth.uid();
  v_allowed boolean;
  v_token text;
  v_request_id bigint;
  v_status text;
  v_message text;
  v_response jsonb;
  v_attempt int := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select exists(
    select 1 from public.user_roles
    where user_id = v_uid
      and role in ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr')
  ) into v_allowed;

  if not v_allowed then
    raise exception 'insufficient_role';
  end if;

  select decrypted_secret
    into v_token
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if v_token is null then
    raise exception 'service_role_key not set';
  end if;

  select net.http_post(
    url := 'https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/ai-admin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_token
    ),
    body := jsonb_build_object(
      'action', p_action,
      'proposal_id', p_proposal_id,
      'optimizer_body', p_optimizer_body
    )
  ) into v_request_id;

  loop
    v_attempt := v_attempt + 1;
    begin
      select r.status::text, r.message, to_jsonb(r.response)
      into v_status, v_message, v_response
      from net._http_collect_response(v_request_id, true) r;
      exit;
    exception when others then
      if v_attempt >= 5 then
        return jsonb_build_object(
          'request_id', v_request_id,
          'status', 'PENDING',
          'message', 'response pending; retry later',
          'response', null
        );
      end if;
      perform pg_sleep(0.5);
    end;
  end loop;

  return jsonb_build_object(
    'request_id', v_request_id,
    'status', v_status,
    'message', v_message,
    'response', v_response
  );
end;
$$;

create or replace function public.check_and_escalate_approvals()
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  pending_request record;
  hours_pending integer;
  next_approver_id uuid;
begin
  for pending_request in
    select ar.*, er.threshold_hours, er.next_role
    from public.approval_requests ar
    left join public.escalation_rules er
      on er.action_type = ar.entity_type
     and er.is_active = true
    where ar.status = 'pending'
      and ar.created_at < now() - interval '1 hour'
  loop
    hours_pending := extract(epoch from (now() - pending_request.created_at)) / 3600;

    if pending_request.threshold_hours is not null and hours_pending >= pending_request.threshold_hours then
      select p.id into next_approver_id
      from public.profiles p
      join public.user_roles ur on ur.user_id = p.id
      where ur.role = pending_request.next_role
        and p.is_active = true
      limit 1;

      if next_approver_id is not null then
        update public.approval_requests
        set current_approver_id = next_approver_id,
            updated_at = now()
        where id = pending_request.id;

        insert into public.audit_logs (
          user_id,
          action,
          entity_type,
          entity_id,
          details
        )
        values (
          null,
          'escalate',
          pending_request.entity_type,
          pending_request.entity_id,
          jsonb_build_object(
            'old_approver_id', pending_request.current_approver_id,
            'new_approver_id', next_approver_id,
            'hours_pending', hours_pending
          )
        );

        insert into public.notifications (
          user_id,
          type,
          title,
          message,
          metadata
        )
        values (
          next_approver_id,
          'escalation_alert'::public.notification_type,
          'Approval Escalated',
          'An approval request has been escalated to you after ' || hours_pending || ' hours.',
          jsonb_build_object(
            'entity_type', pending_request.entity_type,
            'entity_id', pending_request.entity_id,
            'approval_request_id', pending_request.id
          )
        );

        if pending_request.current_approver_id is not null then
          insert into public.notifications (
            user_id,
            type,
            title,
            message,
            metadata
          )
          values (
            pending_request.current_approver_id,
            'escalation_alert'::public.notification_type,
            'Approval Escalated',
            'An approval request has been escalated due to inactivity.',
            jsonb_build_object(
              'entity_type', pending_request.entity_type,
              'entity_id', pending_request.entity_id
            )
          );
        end if;
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.check_and_escalate_maintenance()
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  ticket record;
  rule record;
  next_assignee_id uuid;
  new_due_at timestamptz;
begin
  for ticket in
    select mt.*
    from public.maintenance_tickets mt
    where mt.status in ('open', 'in_progress', 'pending_parts')
      and mt.is_deleted = false
      and (
        (mt.due_at is not null and mt.due_at < now()) or
        (mt.due_at is null and mt.created_at < now() - interval '24 hours')
      )
      and (mt.escalated_at is null or mt.escalated_at < now() - interval '1 hour')
  loop
    select * into rule
    from public.escalation_rules er
    where er.is_active = true
      and er.action_type = 'maintenance_ticket'
    order by er.threshold_hours asc
    limit 1;

    if rule is null then
      continue;
    end if;

    select p.id into next_assignee_id
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    left join public.user_properties up on up.user_id = p.id
    where ur.role = rule.next_role
      and p.is_active = true
      and (
        ticket.property_id is null or
        ur.role in ('regional_admin', 'regional_hr', 'corporate_admin') or
        up.property_id = ticket.property_id
      )
    order by (up.property_id = ticket.property_id) desc, p.created_at
    limit 1;

    if next_assignee_id is null or next_assignee_id = ticket.assigned_to_id then
      continue;
    end if;

    new_due_at := now() + make_interval(hours => coalesce(ticket.sla_hours, rule.threshold_hours));

    update public.maintenance_tickets
    set assigned_to_id = next_assignee_id,
        escalated_at = now(),
        due_at = new_due_at
    where id = ticket.id;

    insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
    values (
      null,
      'escalate',
      'maintenance_ticket',
      ticket.id,
      jsonb_build_object(
        'old_assignee_id', ticket.assigned_to_id,
        'new_assignee_id', next_assignee_id,
        'rule_id', rule.id
      )
    );

    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      next_assignee_id,
      'escalation_alert'::public.notification_type,
      'Maintenance Ticket Escalated',
      format('Maintenance ticket "%s" has been escalated to you.', ticket.title),
      jsonb_build_object('ticket_id', ticket.id)
    );
  end loop;
end;
$$;

create or replace function public.check_and_escalate_requests()
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  pending_step record;
  rule record;
  hours_pending integer;
  next_assignee_id uuid;
  new_due_at timestamptz;
begin
  for pending_step in
    select rs.*, r.entity_type, r.request_no, r.current_assignee_id, r.property_id, r.last_action_at, r.submitted_at, r.created_at
    from public.request_steps rs
    join public.requests r on r.id = rs.request_id
    where rs.status = 'pending'
      and (
        (rs.due_at is not null and rs.due_at < now()) or
        (rs.due_at is null and (r.last_action_at is not null or r.submitted_at is not null))
      )
      and (rs.escalated_at is null or rs.escalated_at < now() - interval '1 hour')
  loop
    select * into rule
    from public.escalation_rules er
    where er.is_active = true
      and er.action_type = pending_step.entity_type
    order by er.threshold_hours asc
    limit 1;

    if rule is null then
      continue;
    end if;

    if pending_step.due_at is null then
      hours_pending := extract(epoch from (now() - coalesce(pending_step.last_action_at, pending_step.submitted_at, pending_step.created_at))) / 3600;
      if hours_pending < rule.threshold_hours then
        continue;
      end if;
    end if;

    select p.id into next_assignee_id
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    left join public.user_properties up on up.user_id = p.id
    where ur.role = rule.next_role
      and p.is_active = true
      and (
        pending_step.property_id is null or
        ur.role in ('regional_admin', 'regional_hr', 'corporate_admin') or
        up.property_id = pending_step.property_id
      )
    order by (up.property_id = pending_step.property_id) desc, p.created_at
    limit 1;

    if next_assignee_id is null or next_assignee_id = pending_step.assignee_id then
      continue;
    end if;

    new_due_at := now() + make_interval(hours => coalesce(pending_step.sla_hours, rule.threshold_hours));

    update public.request_steps
    set assignee_id = next_assignee_id,
        escalated_at = now(),
        due_at = new_due_at
    where id = pending_step.id;

    update public.requests
    set current_assignee_id = next_assignee_id,
        last_action_at = now(),
        due_at = new_due_at
    where id = pending_step.request_id;

    insert into public.request_events (request_id, actor_id, event_type, payload)
    values (
      pending_step.request_id,
      null,
      'forwarded',
      jsonb_build_object(
        'escalated', true,
        'old_assignee_id', pending_step.assignee_id,
        'new_assignee_id', next_assignee_id,
        'rule_id', rule.id,
        'hours_pending', hours_pending
      )
    );

    insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
    values (
      null,
      'escalate',
      pending_step.entity_type,
      pending_step.request_id,
      jsonb_build_object(
        'old_assignee_id', pending_step.assignee_id,
        'new_assignee_id', next_assignee_id,
        'rule_id', rule.id
      )
    );

    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      next_assignee_id,
      'escalation_alert'::public.notification_type,
      'Request Escalated',
      format('Request #%s has been escalated to you.', pending_step.request_no),
      jsonb_build_object('request_id', pending_step.request_id, 'entity_type', pending_step.entity_type)
    );

    if pending_step.assignee_id is not null then
      insert into public.notifications (user_id, type, title, message, metadata)
      values (
        pending_step.assignee_id,
        'escalation_alert'::public.notification_type,
        'Request Escalated',
        format('Request #%s has been escalated to another approver.', pending_step.request_no),
        jsonb_build_object('request_id', pending_step.request_id, 'entity_type', pending_step.entity_type)
      );
    end if;
  end loop;
end;
$$;

create or replace function public.process_notification_batch(p_batch_size integer default 50)
returns table(processed integer, remaining integer)
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_processed int := 0;
  v_remaining int;
  v_item record;
begin
  for v_item in (
    select id, user_id, notification_type, notification_data, batch_id
    from notification_queue
    where status = 'pending'
    order by created_at
    limit p_batch_size
    for update skip locked
  ) loop
    update notification_queue
    set status = 'processing',
        attempts = attempts + 1
    where id = v_item.id;

    insert into notifications (user_id, title, message, type, data)
    values (
      v_item.user_id,
      v_item.notification_data->>'title',
      v_item.notification_data->>'message',
      public.safe_notification_type(v_item.notification_type, 'system'::public.notification_type),
      v_item.notification_data
    );

    update notification_queue
    set status = 'sent',
        processed_at = now()
    where id = v_item.id;

    update notification_batches
    set processed_count = processed_count + 1
    where id = v_item.batch_id;

    v_processed := v_processed + 1;
  end loop;

  select count(*) into v_remaining
  from notification_queue
  where status = 'pending';

  update notification_batches
  set status = 'completed',
      completed_at = now()
  where status = 'processing'
    and processed_count + failed_count >= total_count;

  return query select v_processed, v_remaining;
end;
$$;

create or replace function public.process_due_promotions()
returns integer
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_promo record;
  v_count integer := 0;
begin
  for v_promo in
    select *
    from public.promotions
    where status = 'pending'
      and effective_date <= current_date
  loop
    update public.profiles
    set job_title = v_promo.new_job_title,
        updated_at = now()
    where id = v_promo.employee_id;

    if v_promo.new_role is not null then
      delete from public.user_roles
      where user_id = v_promo.employee_id;

      insert into public.user_roles (user_id, role)
      values (v_promo.employee_id, v_promo.new_role)
      on conflict (user_id, role) do nothing;
    end if;

    delete from public.user_departments
    where user_id = v_promo.employee_id;

    if v_promo.new_department_id is not null then
      insert into public.user_departments (user_id, department_id)
      values (v_promo.employee_id, v_promo.new_department_id)
      on conflict (user_id, department_id) do nothing;
    end if;

    update public.promotions
    set status = 'completed',
        updated_at = now()
    where id = v_promo.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.process_due_transfers()
returns integer
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_transfer record;
  v_count integer := 0;
begin
  for v_transfer in
    select *
    from public.transfers
    where status = 'approved'
      and effective_date <= current_date
  loop
    update public.user_properties
    set property_id = v_transfer.to_property_id
    where user_id = v_transfer.employee_id
      and property_id = v_transfer.from_property_id;

    if not found then
      insert into public.user_properties (user_id, property_id)
      values (v_transfer.employee_id, v_transfer.to_property_id)
      on conflict (user_id, property_id) do nothing;
    end if;

    if v_transfer.to_department_id is not null then
      update public.user_departments
      set department_id = v_transfer.to_department_id
      where user_id = v_transfer.employee_id
        and department_id = v_transfer.from_department_id;

      if not found then
        insert into public.user_departments (user_id, department_id)
        values (v_transfer.employee_id, v_transfer.to_department_id)
        on conflict (user_id, department_id) do nothing;
      end if;
    elsif v_transfer.from_department_id is not null then
      delete from public.user_departments
      where user_id = v_transfer.employee_id
        and department_id = v_transfer.from_department_id;
    end if;

    update public.transfers
    set status = 'completed',
        updated_at = now()
    where id = v_transfer.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;;
