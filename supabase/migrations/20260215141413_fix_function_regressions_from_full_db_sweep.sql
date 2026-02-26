-- Repairs found by full DB function sweep:
-- - stale table/type references
-- - ambiguous variable/column usage
-- - missing schema qualification under hardened search_path

create or replace function public.check_and_escalate_pending_actions()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    rule record;
begin
    for rule in
        select id, action_type
        from public.escalation_rules
        where is_active = true
    loop
        raise notice 'Checking escalation rule % (%).', rule.id, rule.action_type;
    end loop;
end;
$function$;

create or replace function public.create_task_atomic(task_data jsonb, notification_payload jsonb default null::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_task tasks%rowtype;
  v_created_by uuid;
  v_assigned_to uuid;
  v_status text;
  v_priority text;
begin
  v_created_by := nullif(task_data->>'created_by_id', '')::uuid;
  v_assigned_to := nullif(task_data->>'assigned_to_id', '')::uuid;
  v_status := lower(coalesce(task_data->>'status', 'pending'));
  v_priority := lower(coalesce(task_data->>'priority', 'medium'));

  if auth.uid() is not null and v_created_by is distinct from auth.uid() then
    raise exception 'Unauthorized: Creator ID mismatch';
  end if;

  if v_status not in ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold') then
    v_status := 'pending';
  end if;

  insert into public.tasks (
    title,
    description,
    status,
    priority,
    assigned_to_id,
    assigned_to,
    created_by_id,
    property_id,
    department_id,
    due_date
  )
  values (
    nullif(task_data->>'title', ''),
    coalesce(task_data->>'description', ''),
    v_status::public.entity_status,
    v_priority,
    v_assigned_to,
    v_assigned_to,
    v_created_by,
    nullif(task_data->>'property_id', '')::uuid,
    nullif(task_data->>'department_id', '')::uuid,
    nullif(task_data->>'due_date', '')::timestamptz
  )
  returning * into v_task;

  if notification_payload is not null then
    insert into public.notifications (user_id, type, title, message, link, metadata)
    values (
      nullif(notification_payload->>'user_id', '')::uuid,
      coalesce(notification_payload->>'type', 'task_assigned'),
      coalesce(notification_payload->>'title', 'Task Assigned'),
      coalesce(notification_payload->>'message', 'A task was assigned to you.'),
      nullif(notification_payload->>'link', ''),
      coalesce(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_task);
end;
$function$;

create or replace function public.find_hr_assignee(property_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_hr_user_id uuid;
begin
  -- Property HR
  select up.user_id into v_hr_user_id
  from public.user_properties up
  join public.user_roles ur on ur.user_id = up.user_id
  where up.property_id = find_hr_assignee.property_id
    and ur.role = 'property_hr'::public.app_role
  limit 1;

  -- Regional HR fallback
  if v_hr_user_id is null then
    select ur.user_id into v_hr_user_id
    from public.user_roles ur
    where ur.role = 'regional_hr'::public.app_role
    limit 1;
  end if;

  -- Final admin fallback
  if v_hr_user_id is null then
    select ur.user_id into v_hr_user_id
    from public.user_roles ur
    where ur.role = 'corporate_admin'::public.app_role
    limit 1;
  end if;

  return v_hr_user_id;
end;
$function$;

create or replace function public.generate_verification_code()
returns character varying
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
begin
  return upper(encode(extensions.gen_random_bytes(16), 'hex'));
end;
$function$;

create or replace function public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null::uuid,
  p_old_values jsonb default null::jsonb,
  p_new_values jsonb default null::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    ip_address,
    user_agent
  )
  values (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    jsonb_build_object('old', p_old_values, 'new', p_new_values),
    null,
    null
  );
end;
$function$;

create or replace function public.log_pii_access(
  p_target_user_id uuid,
  p_fields_accessed text[],
  p_reason text default null::text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  insert into public.pii_access_logs (
    accessed_by,
    user_id,
    pii_fields,
    justification,
    resource_type,
    resource_id,
    access_type
  )
  values (
    auth.uid(),
    p_target_user_id,
    p_fields_accessed,
    p_reason,
    'profile',
    p_target_user_id,
    'read'
  );
end;
$function$;

create or replace function public.reject_leave_request(
  request_id uuid,
  rejector_id uuid,
  rejection_reason text,
  notification_payload jsonb default null::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_request leave_requests%rowtype;
  v_rejection_reason text := rejection_reason;
begin
  if rejector_id != auth.uid() then
    raise exception 'Unauthorized: Rejector ID mismatch';
  end if;

  update public.leave_requests
  set status = 'rejected'::public.entity_status,
      rejected_by_id = rejector_id,
      rejection_reason = v_rejection_reason,
      updated_at = now()
  where id = request_id
    and status = 'pending'::public.entity_status
  returning * into v_request;

  if not found then
    raise exception 'Leave request not found or not pending';
  end if;

  if notification_payload is not null then
    insert into public.notifications (user_id, type, title, message, link, metadata)
    values (
      nullif(notification_payload->>'user_id', '')::uuid,
      (notification_payload->>'type')::text,
      (notification_payload->>'title')::text,
      (notification_payload->>'message')::text,
      (notification_payload->>'link')::text,
      coalesce(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_request);
end;
$function$;

create or replace function public.replace_workflow_steps(p_workflow_id uuid, p_steps jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_step jsonb;
  v_inserted_count integer := 0;
  v_action text;
begin
  if jsonb_typeof(p_steps) != 'array' then
    raise exception 'Steps must be a JSON array';
  end if;

  if not exists (
    select 1
    from public.workflow_definitions wd
    where wd.id = p_workflow_id
      and wd.is_deleted = false
  ) then
    raise exception 'Workflow not found: %', p_workflow_id;
  end if;

  delete from public.workflow_steps where workflow_id = p_workflow_id;

  for v_step in
    select value
    from jsonb_array_elements(p_steps)
  loop
    v_action := coalesce(v_step->>'action', v_step->>'action_type');
    if v_action is null then
      raise exception 'Each workflow step requires action or action_type';
    end if;

    insert into public.workflow_steps (
      workflow_id,
      step_order,
      name,
      action,
      config
    )
    values (
      p_workflow_id,
      coalesce(
        nullif(v_step->>'step_order', '')::integer,
        nullif(v_step->>'order', '')::integer,
        v_inserted_count + 1
      ),
      coalesce(v_step->>'name', format('Step %s', v_inserted_count + 1)),
      v_action,
      coalesce(v_step->'config', '{}'::jsonb)
    );

    v_inserted_count := v_inserted_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'workflow_id', p_workflow_id,
    'steps_created', v_inserted_count
  );
end;
$function$;

create or replace function public.submit_promotion_request(
  p_employee_id uuid,
  p_new_role public.app_role,
  p_new_job_title text,
  p_new_department_id uuid,
  p_effective_date date,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
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
    v_hr_role public.app_role;
    v_routing_meta jsonb;
begin
    select p.job_title into v_old_job_title from public.profiles p where p.id = p_employee_id;
    select ur.role into v_old_role from public.user_roles ur where ur.user_id = p_employee_id limit 1;
    select ud.department_id into v_old_department_id from public.user_departments ud where ud.user_id = p_employee_id limit 1;
    select up.property_id into v_property_id from public.user_properties up where up.user_id = p_employee_id limit 1;

    insert into public.promotions (
        employee_id, promoted_by, old_role, new_role,
        old_job_title, new_job_title, old_department_id, new_department_id,
        effective_date, notes, status
    ) values (
        p_employee_id, v_requester_id, v_old_role, p_new_role,
        v_old_job_title, p_new_job_title, v_old_department_id, p_new_department_id,
        p_effective_date, p_notes, 'pending'
    ) returning id into v_promotion_id;

    v_hr_assignee := public.find_hr_assignee(v_property_id);

    select ur.role into v_hr_role
    from public.user_roles ur
    where ur.user_id = v_hr_assignee
      and ur.role in ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
    order by case ur.role
      when 'property_hr' then 1
      when 'regional_hr' then 2
      when 'regional_admin' then 3
      when 'corporate_admin' then 4
      else 100
    end
    limit 1;

    if v_hr_role is null then
        v_hr_role := 'regional_hr'::public.app_role;
    end if;

    v_routing_meta := jsonb_build_object('missing_hr_assignee', v_hr_assignee is null);

    insert into public.requests (
        entity_type, entity_id, requester_id, current_assignee_id, status, metadata,
        property_id, department_id
    ) values (
        'promotion',
        v_promotion_id,
        v_requester_id,
        v_hr_assignee,
        'pending_hr_review',
        jsonb_build_object(
            'employee_name', (select p.full_name from public.profiles p where p.id = p_employee_id),
            'new_role', p_new_role,
            'effective_date', p_effective_date,
            'routing_warning', v_routing_meta
        ),
        v_property_id,
        coalesce(p_new_department_id, v_old_department_id)
    ) returning id, request_no into v_request_id, v_request_no;

    insert into public.request_steps (
        request_id, step_order, assignee_id, assignee_role, status
    ) values (
        v_request_id, 1, v_hr_assignee, v_hr_role, 'pending'
    );

    if v_hr_assignee is null then
      insert into public.notifications (user_id, type, title, message, metadata)
      select ur.user_id,
             'escalation_alert',
             'Routing issue: Missing HR assignee',
             format('Promotion request #%s requires HR assignment.', v_request_no),
             jsonb_build_object('request_id', v_request_id, 'entity_type', 'promotion', 'reason', 'missing_hr_assignee')
      from public.user_roles ur
      where ur.role in ('regional_admin', 'regional_hr', 'corporate_admin');
    end if;

    return jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
end;
$function$;

create or replace function public.submit_transfer_request(
  p_employee_id uuid,
  p_to_property_id uuid,
  p_to_department_id uuid,
  p_effective_date date,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_transfer_id uuid;
    v_request_id uuid;
    v_request_no bigint;
    v_requester_id uuid := auth.uid();
    v_from_property_id uuid;
    v_from_department_id uuid;
    v_hr_assignee uuid;
    v_hr_role public.app_role;
    v_routing_meta jsonb;
begin
    select up.property_id into v_from_property_id from public.user_properties up where up.user_id = p_employee_id limit 1;
    select ud.department_id into v_from_department_id from public.user_departments ud where ud.user_id = p_employee_id limit 1;

    insert into public.transfers (
        employee_id, from_property_id, to_property_id,
        from_department_id, to_department_id, effective_date, notes, status
    ) values (
        p_employee_id, v_from_property_id, p_to_property_id,
        v_from_department_id, p_to_department_id, p_effective_date, p_notes, 'pending'
    ) returning id into v_transfer_id;

    v_hr_assignee := public.find_hr_assignee(p_to_property_id);

    select ur.role into v_hr_role
    from public.user_roles ur
    where ur.user_id = v_hr_assignee
      and ur.role in ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
    order by case ur.role
      when 'property_hr' then 1
      when 'regional_hr' then 2
      when 'regional_admin' then 3
      when 'corporate_admin' then 4
      else 100
    end
    limit 1;

    if v_hr_role is null then
        v_hr_role := 'regional_hr'::public.app_role;
    end if;

    v_routing_meta := jsonb_build_object('missing_hr_assignee', v_hr_assignee is null);

    insert into public.requests (
        entity_type, entity_id, requester_id, current_assignee_id, status, metadata,
        property_id, department_id
    ) values (
        'transfer',
        v_transfer_id,
        v_requester_id,
        v_hr_assignee,
        'pending_hr_review',
        jsonb_build_object(
            'employee_name', (select p.full_name from public.profiles p where p.id = p_employee_id),
            'target_property', (select pr.name from public.properties pr where pr.id = p_to_property_id),
            'effective_date', p_effective_date,
            'routing_warning', v_routing_meta
        ),
        p_to_property_id,
        p_to_department_id
    ) returning id, request_no into v_request_id, v_request_no;

    insert into public.request_steps (
        request_id, step_order, assignee_id, assignee_role, status
    ) values (
        v_request_id, 1, v_hr_assignee, v_hr_role, 'pending'
    );

    if v_hr_assignee is null then
      insert into public.notifications (user_id, type, title, message, metadata)
      select ur.user_id,
             'escalation_alert',
             'Routing issue: Missing HR assignee',
             format('Transfer request #%s requires HR assignment.', v_request_no),
             jsonb_build_object('request_id', v_request_id, 'entity_type', 'transfer', 'reason', 'missing_hr_assignee')
      from public.user_roles ur
      where ur.role in ('regional_admin', 'regional_hr', 'corporate_admin');
    end if;

    return jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
end;
$function$;;
