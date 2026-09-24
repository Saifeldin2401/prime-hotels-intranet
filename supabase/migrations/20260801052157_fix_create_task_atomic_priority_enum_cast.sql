-- ============================================================================
-- MIGRATION: fix_create_task_atomic_priority_enum_cast
-- Same function, another latent bug found in the same rolled-back functional
-- test: tasks.priority is the task_priority enum (low/medium/high/urgent)
-- but v_priority was plain text with no cast -- INSERT would fail on any
-- call, exactly like the assigned_to bug fixed moments ago. Adds the cast
-- plus a validation fallback mirroring the existing status-validation style.
--
-- Applied live via Supabase MCP apply_migration on 2026-07-27.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_task_atomic(task_data jsonb, notification_payload jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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

  if v_priority not in ('low', 'medium', 'high', 'urgent') then
    v_priority := 'medium';
  end if;

  insert into public.tasks (
    title,
    description,
    status,
    priority,
    assigned_to_id,
    created_by_id,
    property_id,
    department_id,
    due_date,
    project_id
  )
  values (
    nullif(task_data->>'title', ''),
    coalesce(task_data->>'description', ''),
    v_status::public.entity_status,
    v_priority::public.task_priority,
    v_assigned_to,
    v_created_by,
    nullif(task_data->>'property_id', '')::uuid,
    nullif(task_data->>'department_id', '')::uuid,
    nullif(task_data->>'due_date', '')::timestamptz,
    nullif(task_data->>'project_id', '')::uuid
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
$function$;
