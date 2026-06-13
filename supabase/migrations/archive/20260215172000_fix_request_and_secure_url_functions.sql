create or replace function public.get_secure_document_url(document_id uuid)
returns text
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  doc record;
  v_relative_path text;
  v_host text;
begin
  select d.*
  into doc
  from public.documents d
  where d.id = document_id
  limit 1;

  if doc is null then
    raise exception 'Document not found';
  end if;

  if not public.can_view_document(document_id) then
    raise exception 'Not authorized to access this document';
  end if;

  if doc.file_url is null or length(trim(doc.file_url)) = 0 then
    raise exception 'Document file URL is missing';
  end if;

  if doc.file_url ~* '^https?://' then
    return doc.file_url;
  end if;

  v_relative_path := regexp_replace(doc.file_url, '^.*documents/', '');
  if v_relative_path = doc.file_url then
    return doc.file_url;
  end if;

  v_host := coalesce(
    nullif((current_setting('request.headers', true)::jsonb ->> 'host'), ''),
    'dhbfaclkfysqwfppuxxa.supabase.co'
  );

  return format(
    'https://%s/storage/v1/object/public/documents/%s',
    v_host,
    ltrim(v_relative_path, '/')
  );
end;
$$;

create or replace function public.get_secure_payslip_url(p_payslip_id uuid)
returns text
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_payslip record;
begin
  select *
  into v_payslip
  from public.payslips
  where id = p_payslip_id
  limit 1;

  if v_payslip is null then
    raise exception 'Payslip not found';
  end if;

  if v_payslip.storage_path is null then
    raise exception 'Payslip file not available';
  end if;

  if v_payslip.employee_id <> auth.uid()
     and not (
       public.has_role_optimized('corporate_admin'::public.app_role) or
       public.has_role_optimized('regional_admin'::public.app_role) or
       public.has_role_optimized('regional_hr'::public.app_role) or
       public.has_role_optimized('property_hr'::public.app_role)
     ) then
    raise exception 'Not authorized to access this payslip';
  end if;

  return v_payslip.storage_path;
end;
$$;

create or replace function public.request_apply_action(
  p_request_id uuid,
  p_action text,
  p_comment text default null::text,
  p_forward_to uuid default null::uuid,
  p_visibility text default 'all'::text
)
returns table(success boolean, message text)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
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

  if current_step is null and p_action in ('approve', 'reject', 'return', 'forward') then
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

      if next_step is not null then
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
$$;

create or replace function public.submit_promotion_request(
  p_employee_id uuid,
  p_new_role app_role,
  p_new_job_title text,
  p_new_department_id uuid,
  p_notes text
)
returns jsonb
language plpgsql
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_promotion_id uuid;
  v_request_id uuid;
  v_request_no bigint;
  v_requester_id uuid := auth.uid();
  v_old_role public.app_role;
  v_old_job_title text;
  v_old_department_id uuid;
  v_property_id uuid;
  v_hr_assignee uuid;
  v_effective_date date := current_date;
begin
  select job_title into v_old_job_title from public.profiles where id = p_employee_id;
  select role into v_old_role from public.user_roles where user_id = p_employee_id limit 1;
  select department_id into v_old_department_id from public.user_departments where user_id = p_employee_id limit 1;
  select property_id into v_property_id from public.user_properties where user_id = p_employee_id limit 1;
  insert into public.promotions (employee_id, promoted_by, old_role, new_role, old_job_title, new_job_title, old_department_id, new_department_id, effective_date, notes, status)
  values (p_employee_id, v_requester_id, v_old_role, p_new_role, v_old_job_title, p_new_job_title, v_old_department_id, p_new_department_id, v_effective_date, p_notes, 'pending')
  returning id into v_promotion_id;

  select user_id into v_hr_assignee from public.user_roles where role = 'regional_hr' limit 1;
  insert into public.requests (entity_type, entity_id, requester_id, current_assignee_id, status, metadata)
  values ('promotion', v_promotion_id, v_requester_id, v_hr_assignee, 'pending_hr_review', jsonb_build_object('employee_name', (select full_name from public.profiles where id = p_employee_id), 'new_role', p_new_role, 'effective_date', v_effective_date))
  returning id, request_no into v_request_id, v_request_no;

  insert into public.request_steps (request_id, step_order, assignee_id, assignee_role, status)
  values (v_request_id, 1, v_hr_assignee, 'regional_hr', 'pending');

  return jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
end;
$$;
