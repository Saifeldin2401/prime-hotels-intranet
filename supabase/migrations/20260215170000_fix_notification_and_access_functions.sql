create or replace function public.safe_notification_type(
  p_value text,
  p_default public.notification_type default 'system'::public.notification_type
)
returns public.notification_type
language plpgsql
immutable
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_value text;
begin
  v_value := lower(trim(coalesce(p_value, '')));
  if v_value = '' then
    return p_default;
  end if;

  begin
    return v_value::public.notification_type;
  exception when others then
    return p_default;
  end;
end;
$$;

create or replace function public.approve_document_atomic(
  p_approval_id uuid,
  p_approver_id uuid,
  p_feedback text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_document_id uuid;
  v_document_title text;
  v_document_author uuid;
  v_remaining_pending integer;
  v_delegator_id uuid;
  v_delegation_id uuid;
  v_max_approvals integer;
  v_approvals_used integer;
  v_notify_on_action boolean;
  v_notify_delegator boolean;
  v_delegate_name text;
  v_is_delegate boolean := false;
begin
  if not public.can_user_act_on_document_approval(p_approver_id, p_approval_id) then
    raise exception 'Not authorized to approve this item';
  end if;

  select da.document_id, da.approver_id
  into v_document_id, v_delegator_id
  from public.document_approvals da
  where da.id = p_approval_id
  for update;

  select ta.id,
         ta.max_approvals,
         ta.approvals_used,
         ta.notify_on_action,
         ta.notify_delegator
  into v_delegation_id,
       v_max_approvals,
       v_approvals_used,
       v_notify_on_action,
       v_notify_delegator
  from public.temporary_approvers ta
  join public.documents d on d.id = v_document_id
  where ta.delegator_id = v_delegator_id
    and (ta.delegate_id = p_approver_id or p_approver_id = any(ta.fallback_delegate_ids))
    and ta.start_at <= now()
    and ta.end_at >= now()
    and (
      (ta.entity_type is not null and ta.entity_id is not null
       and ta.entity_type = 'document_approval'
       and ta.entity_id = p_approval_id)
      or
      (ta.entity_type is null and ta.entity_id is null
       and (
         ta.scope_type = 'all'
         or (ta.scope_type = 'property' and ta.scope_id is not distinct from d.property_id)
         or (ta.scope_type = 'department' and ta.scope_id is not distinct from d.department_id)
       ))
    )
  order by (ta.entity_id is not null) desc, (ta.entity_type is not null) desc, ta.start_at desc
  limit 1;

  v_is_delegate := v_delegation_id is not null and p_approver_id <> v_delegator_id;

  if v_is_delegate and v_max_approvals is not null and v_approvals_used >= v_max_approvals then
    raise exception 'Delegation approval limit reached';
  end if;

  update public.document_approvals
  set status = 'approved',
      approved_at = now(),
      feedback = coalesce(p_feedback, feedback),
      approved_by = p_approver_id,
      is_active = false,
      updated_at = now()
  where id = p_approval_id
    and status = 'pending'
    and is_active = true;

  if v_is_delegate then
    update public.temporary_approvers
    set approvals_used = coalesce(approvals_used, 0) + 1
    where id = v_delegation_id;
  end if;

  select d.title, d.created_by
  into v_document_title, v_document_author
  from public.documents d
  where d.id = v_document_id;

  if v_is_delegate and coalesce(v_notify_on_action, true) and coalesce(v_notify_delegator, true) then
    select full_name into v_delegate_name from public.profiles where id = p_approver_id;
    if v_delegator_id is not null and v_delegator_id <> p_approver_id then
      insert into public.notifications (user_id, type, title, message, metadata)
      values (
        v_delegator_id,
        'request_approved'::public.notification_type,
        'Delegated Approval Completed',
        coalesce(v_delegate_name, 'A delegate') || ' approved a document on your behalf.',
        jsonb_build_object(
          'entity_type', 'document_approval',
          'entity_id', p_approval_id,
          'document_id', v_document_id
        )
      );
    end if;
  end if;

  select count(*)
  into v_remaining_pending
  from public.document_approvals
  where document_id = v_document_id
    and status = 'pending'
    and is_active = true;

  if v_remaining_pending = 0 then
    update public.documents
    set status = 'PUBLISHED',
        updated_at = now()
    where id = v_document_id;

    if v_document_author is not null and v_document_author <> p_approver_id then
      insert into public.notifications (user_id, type, title, message, metadata)
      values (
        v_document_author,
        'request_approved'::public.notification_type,
        'Document Approved',
        'Your document "' || coalesce(v_document_title, 'Document') || '" has been approved and published.',
        jsonb_build_object(
          'entity_type', 'document',
          'entity_id', v_document_id,
          'link', '/documents/' || v_document_id::text,
          'approval_id', p_approval_id,
          'published', true
        )
      );
    end if;

    return jsonb_build_object('success', true, 'document_id', v_document_id, 'published', true);
  end if;

  return jsonb_build_object('success', true, 'document_id', v_document_id, 'published', false, 'remaining_pending', v_remaining_pending);
end;
$$;

create or replace function public.reject_document_atomic(
  p_approval_id uuid,
  p_approver_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_document_id uuid;
  v_document_title text;
  v_document_author uuid;
  v_delegator_id uuid;
  v_delegation_id uuid;
  v_max_approvals integer;
  v_approvals_used integer;
  v_notify_on_action boolean;
  v_notify_delegator boolean;
  v_delegate_name text;
  v_is_delegate boolean := false;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Rejection reason is required';
  end if;

  if not public.can_user_act_on_document_approval(p_approver_id, p_approval_id) then
    raise exception 'Not authorized to reject this item';
  end if;

  select da.document_id, da.approver_id
  into v_document_id, v_delegator_id
  from public.document_approvals da
  where da.id = p_approval_id
  for update;

  select ta.id,
         ta.max_approvals,
         ta.approvals_used,
         ta.notify_on_action,
         ta.notify_delegator
  into v_delegation_id,
       v_max_approvals,
       v_approvals_used,
       v_notify_on_action,
       v_notify_delegator
  from public.temporary_approvers ta
  join public.documents d on d.id = v_document_id
  where ta.delegator_id = v_delegator_id
    and (ta.delegate_id = p_approver_id or p_approver_id = any(ta.fallback_delegate_ids))
    and ta.start_at <= now()
    and ta.end_at >= now()
    and (
      (ta.entity_type is not null and ta.entity_id is not null
       and ta.entity_type = 'document_approval'
       and ta.entity_id = p_approval_id)
      or
      (ta.entity_type is null and ta.entity_id is null
       and (
         ta.scope_type = 'all'
         or (ta.scope_type = 'property' and ta.scope_id is not distinct from d.property_id)
         or (ta.scope_type = 'department' and ta.scope_id is not distinct from d.department_id)
       ))
    )
  order by (ta.entity_id is not null) desc, (ta.entity_type is not null) desc, ta.start_at desc
  limit 1;

  v_is_delegate := v_delegation_id is not null and p_approver_id <> v_delegator_id;

  if v_is_delegate and v_max_approvals is not null and v_approvals_used >= v_max_approvals then
    raise exception 'Delegation approval limit reached';
  end if;

  update public.document_approvals
  set status = 'rejected',
      rejected_at = now(),
      rejected_by = p_approver_id,
      rejection_reason = p_reason,
      is_active = false,
      updated_at = now()
  where id = p_approval_id
    and status = 'pending'
    and is_active = true;

  if v_is_delegate then
    update public.temporary_approvers
    set approvals_used = coalesce(approvals_used, 0) + 1
    where id = v_delegation_id;
  end if;

  update public.documents
  set status = 'REJECTED',
      updated_at = now()
  where id = v_document_id;

  select d.title, d.created_by
  into v_document_title, v_document_author
  from public.documents d
  where d.id = v_document_id;

  if v_is_delegate and coalesce(v_notify_on_action, true) and coalesce(v_notify_delegator, true) then
    select full_name into v_delegate_name from public.profiles where id = p_approver_id;
    if v_delegator_id is not null and v_delegator_id <> p_approver_id then
      insert into public.notifications (user_id, type, title, message, metadata)
      values (
        v_delegator_id,
        'request_rejected'::public.notification_type,
        'Delegated Approval Completed',
        coalesce(v_delegate_name, 'A delegate') || ' rejected a document on your behalf.',
        jsonb_build_object(
          'entity_type', 'document_approval',
          'entity_id', p_approval_id,
          'document_id', v_document_id
        )
      );
    end if;
  end if;

  if v_document_author is not null and v_document_author <> p_approver_id then
    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      v_document_author,
      'request_rejected'::public.notification_type,
      'Document Rejected',
      'Your document "' || coalesce(v_document_title, 'Document') || '" was rejected. Reason: ' || p_reason,
      jsonb_build_object(
        'entity_type', 'document',
        'entity_id', v_document_id,
        'link', '/documents/' || v_document_id::text,
        'approval_id', p_approval_id
      )
    );
  end if;

  return jsonb_build_object('success', true, 'document_id', v_document_id, 'rejected', true);
end;
$$;

create or replace function public.approve_leave_request(
  request_id uuid,
  approver_id uuid,
  notification_payload jsonb default null::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_request leave_requests%rowtype;
begin
  if approver_id != auth.uid() then
    raise exception 'Unauthorized: Approver ID mismatch';
  end if;

  update leave_requests
  set status = 'approved',
      approved_by_id = approver_id,
      updated_at = now()
  where id = request_id and status = 'pending'
  returning * into v_request;

  if not found then
    raise exception 'Leave request not found or not pending';
  end if;

  if notification_payload is not null then
    insert into notifications (user_id, type, title, message, link, metadata)
    values (
      nullif(notification_payload->>'user_id', '')::uuid,
      public.safe_notification_type(notification_payload->>'type', 'request_approved'::public.notification_type),
      notification_payload->>'title',
      notification_payload->>'message',
      notification_payload->>'link',
      coalesce(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_request);
end;
$$;

create or replace function public.assign_maintenance_ticket(
  p_ticket_id uuid,
  p_assigner_id uuid,
  p_assigned_to_id uuid,
  p_notification_payload jsonb default null::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_ticket maintenance_tickets%rowtype;
  v_new_status maintenance_tickets.status%type;
begin
  if p_assigner_id != auth.uid() then
    raise exception 'Unauthorized: Assigner ID mismatch';
  end if;

  if not exists (
    select 1
    from user_roles
    where user_id = auth.uid()
      and role in ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff')
  ) then
    raise exception 'Unauthorized: Insufficient permissions to assign tickets';
  end if;

  if p_assigned_to_id is not null then
    v_new_status := 'in_progress';
  else
    v_new_status := 'open';
  end if;

  update maintenance_tickets
  set assigned_to_id = p_assigned_to_id,
      status = v_new_status,
      updated_at = now()
  where id = p_ticket_id
  returning * into v_ticket;

  if not found then
    raise exception 'Maintenance ticket not found';
  end if;

  if p_notification_payload is not null and p_assigned_to_id is not null and p_assigned_to_id != p_assigner_id then
    insert into notifications (user_id, type, title, message, link, metadata)
    values (
      p_assigned_to_id,
      public.safe_notification_type(p_notification_payload->>'type', 'maintenance_assigned'::public.notification_type),
      p_notification_payload->>'title',
      p_notification_payload->>'message',
      p_notification_payload->>'link',
      coalesce(p_notification_payload->'metadata', p_notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_ticket);
end;
$$;

create or replace function public.complete_maintenance_ticket(
  ticket_id uuid,
  completer_id uuid,
  labor_hours numeric default null::numeric,
  material_cost numeric default null::numeric,
  notes text default null::text,
  notification_payload jsonb default null::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_ticket maintenance_tickets%rowtype;
begin
  if completer_id != auth.uid() then
    raise exception 'Unauthorized: Completer ID mismatch';
  end if;

  update maintenance_tickets
  set status = 'completed',
      labor_hours = complete_maintenance_ticket.labor_hours,
      material_cost = complete_maintenance_ticket.material_cost,
      notes = complete_maintenance_ticket.notes,
      resolved_at = now(),
      updated_at = now()
  where id = ticket_id
  returning * into v_ticket;

  if not found then
    raise exception 'Maintenance ticket not found';
  end if;

  if notification_payload is not null and v_ticket.reported_by_id is not null and v_ticket.reported_by_id != completer_id then
    insert into notifications (user_id, type, title, message, link, metadata)
    values (
      v_ticket.reported_by_id,
      public.safe_notification_type(notification_payload->>'type', 'maintenance_resolved'::public.notification_type),
      notification_payload->>'title',
      notification_payload->>'message',
      notification_payload->>'link',
      coalesce(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_ticket);
end;
$$;

create or replace function public.create_task_atomic(
  task_data jsonb,
  notification_payload jsonb default null::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
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
      public.safe_notification_type(notification_payload->>'type', 'task_assigned'::public.notification_type),
      coalesce(notification_payload->>'title', 'Task Assigned'),
      coalesce(notification_payload->>'message', 'A task was assigned to you.'),
      nullif(notification_payload->>'link', ''),
      coalesce(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_task);
end;
$$;

create or replace function public.reject_leave_request(
  request_id uuid,
  rejector_id uuid,
  rejection_reason text,
  notification_payload jsonb default null::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
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
      public.safe_notification_type(notification_payload->>'type', 'request_rejected'::public.notification_type),
      notification_payload->>'title',
      notification_payload->>'message',
      notification_payload->>'link',
      coalesce(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_request);
end;
$$;

create or replace function public.can_view_document(document_id uuid)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  doc record;
begin
  select id, visibility, property_id, department_id, role, created_by
  into doc
  from public.documents
  where id = document_id
  limit 1;

  if doc is null then
    return false;
  end if;

  if auth.uid() is null then
    return false;
  end if;

  if doc.created_by = auth.uid() then
    return true;
  end if;

  if doc.visibility = 'all_properties'::public.document_visibility then
    return true;
  elsif doc.visibility = 'property'::public.document_visibility then
    return exists (
      select 1
      from public.user_properties up
      where up.user_id = auth.uid()
        and up.property_id = doc.property_id
    );
  elsif doc.visibility = 'department'::public.document_visibility then
    return exists (
      select 1
      from public.user_departments ud
      where ud.user_id = auth.uid()
        and ud.department_id = doc.department_id
    );
  elsif doc.visibility = 'role'::public.document_visibility then
    return exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and (doc.role is null or ur.role = doc.role)
    );
  end if;

  return false;
end;
$$;
