-- ============================================================================
-- MIGRATION: fix_create_task_atomic_and_adopt_capex_module
-- Two things happened together here:
--
-- 1. Found and fixed TWO independent, pre-existing bugs in create_task_atomic()
-- (the RPC every task creation in the app calls via useCreateTask()), caught
-- via rolled-back functional tests while wiring in Projects support:
--    a) it inserted into a column `assigned_to` that does not exist on
--       public.tasks (only assigned_to_id exists) -- every task creation
--       attempt failed outright with a hard SQL error.
--    b) tasks.priority is the task_priority enum but v_priority was plain
--       text with no cast -- would also fail on any call.
-- tasks had 0 rows, confirming task creation has never worked in this live
-- database until this fix.
--
-- 2. A simpler `projects` table + `tasks.project_id` reuse was built and
-- briefly applied live to close the Projects/Pre-opening/CAPEX domain gap,
-- then superseded before any real data existed by a more complete,
-- purpose-built design already drafted locally (capex_projects/milestones/
-- expenditures/pre_opening_checklist_items/capex_project_templates -- see
-- 20260727022238_add_capex_projects_module.sql, applied live in the same
-- migration as this file). This migration drops the superseded
-- tasks.project_id column and projects table (both had 0 real rows) and
-- removes the now-unnecessary project_id handling from create_task_atomic.
--
-- Applied live via Supabase MCP apply_migration on 2026-07-27 (combined with
-- the capex_projects module content, which matches the local file verbatim
-- and needed no separate re-application).
-- ============================================================================

ALTER TABLE public.tasks DROP COLUMN IF EXISTS project_id;
DROP TABLE IF EXISTS public.projects;

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
    due_date
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
$function$;
