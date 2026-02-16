create or replace function public.apply_promotion()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
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
$$;

create or replace function public.apply_transfer()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if new.effective_date <= current_date then
    update public.user_properties
    set property_id = new.to_property_id
    where user_id = new.employee_id
      and property_id = new.from_property_id;

    if not found then
      insert into public.user_properties (user_id, property_id)
      values (new.employee_id, new.to_property_id)
      on conflict (user_id, property_id) do nothing;
    end if;

    if new.to_department_id is not null then
      delete from public.user_departments where user_id = new.employee_id;
      insert into public.user_departments (user_id, department_id)
      values (new.employee_id, new.to_department_id)
      on conflict (user_id, department_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.apply_training_rules_to_user()
returns trigger
language plpgsql
set search_path = 'public'
as $$
declare
  v_new jsonb := to_jsonb(new);
  v_user_id uuid;
  v_department_id uuid;
  v_role_text text;
  v_job_title_id uuid;
begin
  if tg_table_name = 'user_departments' then
    v_user_id := nullif(v_new->>'user_id', '')::uuid;
    v_department_id := nullif(v_new->>'department_id', '')::uuid;
  elsif tg_table_name = 'user_roles' then
    v_user_id := nullif(v_new->>'user_id', '')::uuid;
    v_role_text := nullif(v_new->>'role', '');
  elsif tg_table_name = 'profiles' then
    v_user_id := nullif(v_new->>'id', '')::uuid;
    v_job_title_id := nullif(v_new->>'job_title_id', '')::uuid;
  else
    return new;
  end if;

  if v_user_id is null then
    return new;
  end if;

  insert into public.learning_assignments (
    target_type,
    target_id,
    content_type,
    content_id,
    due_date,
    priority,
    assigned_by,
    created_at
  )
  select
    'user'::learning_target_type,
    v_user_id::text,
    'module'::learning_content_type,
    tar.training_module_id,
    now() + interval '30 days',
    'normal',
    tar.created_by,
    now()
  from public.training_assignment_rules tar
  where tar.is_active = true
    and (
      (v_department_id is not null and tar.target_department_id = v_department_id) or
      (v_role_text is not null and tar.target_role = v_role_text) or
      (v_job_title_id is not null and tar.job_title_id = v_job_title_id)
    )
    and not exists (
      select 1
      from public.learning_assignments la
      where la.target_id = v_user_id::text
        and la.content_id = tar.training_module_id
        and la.content_type = 'module'::learning_content_type
    );

  return new;
end;
$$;

create or replace function public.create_hr_notification()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_new jsonb := to_jsonb(new);
begin
  if tg_table_name = 'performance_reviews' then
    insert into public.notifications (user_id, title, message, type, link)
    values (
      nullif(v_new->>'employee_id', '')::uuid,
      'New Performance Review',
      'Your performance review for ' || coalesce(v_new->>'review_period', 'this period') || ' is ready.',
      'system'::public.notification_type,
      '/hr/performance'
    );
  elsif tg_table_name = 'goals' and coalesce(v_new->>'status', '') = 'completed' then
    insert into public.notifications (user_id, title, message, type, link)
    values (
      nullif(v_new->>'employee_id', '')::uuid,
      'Goal Completed',
      'Congratulations on achieving your goal: ' || coalesce(v_new->>'title', 'Goal'),
      'system'::public.notification_type,
      '/hr/goals'
    );
  elsif tg_table_name = 'certificates' then
    insert into public.notifications (user_id, title, message, type, link)
    values (
      nullif(v_new->>'user_id', '')::uuid,
      'Certificate Issued',
      'A new certificate has been issued for: ' || coalesce(v_new->>'title', 'training'),
      'system'::public.notification_type,
      '/profile'
    );
  end if;
  return new;
end;
$$;

create or replace function public.create_request_for_leave_request()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  supervisor_id uuid;
  hr_assignee_id uuid;
  supervisor_role public.app_role;
  hr_role public.app_role;
  request_id uuid;
  v_request_no bigint;
  initial_status text;
  hr_step_status text;
  routing_meta jsonb;
begin
  select reporting_to into supervisor_id
  from public.profiles
  where id = new.requester_id;

  hr_assignee_id := public.find_hr_assignee(new.property_id);

  select ur.role into supervisor_role
  from public.user_roles ur
  where ur.user_id = supervisor_id
  order by case ur.role
    when 'property_manager' then 1
    when 'department_head' then 2
    when 'manager' then 3
    when 'property_hr' then 4
    when 'regional_hr' then 5
    when 'regional_admin' then 6
    when 'corporate_admin' then 7
    else 100
  end
  limit 1;

  if supervisor_role is null then
    supervisor_role := 'manager';
  end if;

  select ur.role into hr_role
  from public.user_roles ur
  where ur.user_id = hr_assignee_id
    and ur.role in ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
  order by case ur.role
    when 'property_hr' then 1
    when 'regional_hr' then 2
    when 'regional_admin' then 3
    when 'corporate_admin' then 4
    else 100
  end
  limit 1;

  if hr_role is null then
    hr_role := 'regional_hr';
  end if;

  routing_meta := jsonb_build_object(
    'missing_supervisor', supervisor_id is null,
    'missing_hr_assignee', hr_assignee_id is null
  );

  initial_status := case
    when new.status = 'pending' and supervisor_id is null then 'pending_hr_review'
    when new.status = 'pending' then 'pending_supervisor_approval'
    else 'draft'
  end;

  insert into public.requests (
    entity_type, entity_id, requester_id, supervisor_id, current_assignee_id,
    status, submitted_at, metadata, property_id, department_id
  )
  values (
    'leave_request',
    new.id,
    new.requester_id,
    supervisor_id,
    coalesce(supervisor_id, hr_assignee_id),
    initial_status,
    case when new.status = 'pending' then now() else null end,
    jsonb_build_object(
      'leave_type', new.type,
      'start_date', new.start_date,
      'end_date', new.end_date,
      'reason', new.reason,
      'routing_warning', routing_meta
    ),
    new.property_id,
    new.department_id
  )
  returning id, request_no into request_id, v_request_no;

  update public.leave_requests
  set workflow_request_id = request_id
  where id = new.id;

  if supervisor_id is not null then
    insert into public.request_steps (
      request_id, step_order, assignee_id, assignee_role, status, created_by
    )
    values (
      request_id, 1, supervisor_id, supervisor_role,
      case when new.status = 'pending' then 'pending' else 'waiting' end,
      new.requester_id
    );
  end if;

  hr_step_status := case
    when new.status = 'pending' and supervisor_id is null then 'pending'
    else 'waiting'
  end;

  insert into public.request_steps (
    request_id, step_order, assignee_id, assignee_role, status, created_by
  )
  values (
    request_id,
    case when supervisor_id is not null then 2 else 1 end,
    hr_assignee_id,
    hr_role,
    hr_step_status,
    new.requester_id
  );

  if hr_assignee_id is null then
    insert into public.notifications (user_id, type, title, message, metadata)
    select ur.user_id,
           'escalation_alert'::public.notification_type,
           'Routing issue: Missing HR assignee',
           format('Leave request #%s requires HR assignment.', v_request_no),
           jsonb_build_object('request_id', request_id, 'entity_type', 'leave_request', 'reason', 'missing_hr_assignee')
    from public.user_roles ur
    where ur.role in ('regional_admin', 'regional_hr', 'corporate_admin');
  end if;

  return new;
end;
$$;

create or replace function public.handle_referral_history_and_notifications()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  job_title text;
begin
  if coalesce(new.referred_by, old.referred_by) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.referral_history (referral_id, old_status, new_status, changed_by, change_note)
    values (new.id, null, new.status, auth.uid(), 'Referral submitted');

    select title into job_title from public.job_postings where id = new.job_posting_id;

    insert into public.notifications (user_id, type, title, message, entity_type, entity_id, metadata)
    select distinct ur.user_id,
      'referral_status_update'::public.notification_type,
      'New referral submitted',
      coalesce(new.applicant_name, 'Candidate') || ' was referred for ' || coalesce(job_title, 'a role') || '.',
      'job_application',
      new.id,
      jsonb_build_object('status', new.status, 'job_posting_id', new.job_posting_id)
    from public.user_roles ur
    where ur.role in ('corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'property_manager');

    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.referral_history (referral_id, old_status, new_status, changed_by, change_note)
    values (new.id, old.status, new.status, auth.uid(), null);

    if new.referred_by is not null then
      insert into public.notifications (user_id, type, title, message, entity_type, entity_id, metadata)
      values (
        new.referred_by,
        'referral_status_update'::public.notification_type,
        'Referral status updated',
        coalesce(new.applicant_name, 'Candidate') || ' status changed to ' || new.status || '.',
        'job_application',
        new.id,
        jsonb_build_object('status', new.status, 'job_posting_id', new.job_posting_id)
      );
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.update_maintenance_tickets_updated_at()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  new.updated_at = now();

  if old.status != 'completed' and new.status = 'completed' then
    new.resolved_at = now();
    new.actual_completion_date = now();
  end if;

  return new;
end;
$$;
