do $$
declare
  v_any uuid;
  v_guest uuid;
  v_housekeeping uuid;
  v_safety uuid;
  v_night_audit uuid;
  v_hospitality uuid;
  v_hq_property uuid;
  v_dept_front uuid;
  v_dept_housekeeping uuid;
  v_dept_security uuid;
  v_dept_maintenance uuid;
  v_job_night_auditor uuid;
  v_workflow_front uuid;
  v_workflow_house uuid;
  v_workflow_onboard uuid;
  v_workflow_welcome uuid;
begin
  select id into v_any from public.training_modules where status = 'published' order by created_at desc limit 1;

  select id into v_guest
  from public.training_modules
  where status = 'published' and title ilike '%guest%check%in%'
  order by created_at desc
  limit 1;
  if v_guest is null then v_guest := v_any; end if;

  select id into v_housekeeping
  from public.training_modules
  where status = 'published' and title ilike '%housekeeping%'
  order by created_at desc
  limit 1;
  if v_housekeeping is null then v_housekeeping := v_any; end if;

  select id into v_safety
  from public.training_modules
  where status = 'published' and (title ilike '%safety%' or title ilike '%emergency%')
  order by created_at desc
  limit 1;
  if v_safety is null then v_safety := v_any; end if;

  select id into v_night_audit
  from public.training_modules
  where status = 'published' and title ilike '%night audit%'
  order by created_at desc
  limit 1;
  if v_night_audit is null then v_night_audit := v_any; end if;

  select id into v_hospitality
  from public.training_modules
  where status = 'published' and title ilike '%hospitality%'
  order by created_at desc
  limit 1;
  if v_hospitality is null then v_hospitality := v_any; end if;

  select id into v_hq_property
  from public.properties
  where is_headquarters = true
  order by created_at asc
  limit 1;

  select id into v_dept_front
  from public.departments
  where property_id = v_hq_property and name ilike 'Front Office'
  limit 1;

  select id into v_dept_housekeeping
  from public.departments
  where property_id = v_hq_property and name ilike 'Housekeeping'
  limit 1;

  select id into v_dept_security
  from public.departments
  where property_id = v_hq_property and name ilike 'Security'
  limit 1;

  select id into v_dept_maintenance
  from public.departments
  where property_id = v_hq_property and name ilike 'Maintenance'
  limit 1;

  select id into v_job_night_auditor
  from public.job_titles
  where lower(title) = 'night auditor'
  limit 1;

  -- Training auto-assignment rules (idempotent)
  if v_guest is not null then
    insert into public.training_assignment_rules (training_module_id, target_role, target_department_id, job_title_id, is_active)
    select v_guest, 'staff', null, null, true
    where not exists (
      select 1 from public.training_assignment_rules
      where training_module_id = v_guest
        and target_role = 'staff'
        and target_department_id is null
        and job_title_id is null
    );
  end if;

  if v_safety is not null then
    insert into public.training_assignment_rules (training_module_id, target_role, target_department_id, job_title_id, is_active)
    select v_safety, 'department_head', null, null, true
    where not exists (
      select 1 from public.training_assignment_rules
      where training_module_id = v_safety
        and target_role = 'department_head'
        and target_department_id is null
        and job_title_id is null
    );
  end if;

  if v_dept_maintenance is not null and v_safety is not null then
    insert into public.training_assignment_rules (training_module_id, target_role, target_department_id, job_title_id, is_active)
    select v_safety, null, v_dept_maintenance, null, true
    where not exists (
      select 1 from public.training_assignment_rules
      where training_module_id = v_safety
        and target_role is null
        and target_department_id = v_dept_maintenance
        and job_title_id is null
    );
  end if;

  if v_dept_front is not null and v_guest is not null then
    insert into public.training_assignment_rules (training_module_id, target_role, target_department_id, job_title_id, is_active)
    select v_guest, null, v_dept_front, null, true
    where not exists (
      select 1 from public.training_assignment_rules
      where training_module_id = v_guest
        and target_role is null
        and target_department_id = v_dept_front
        and job_title_id is null
    );
  end if;

  if v_dept_housekeeping is not null and v_housekeeping is not null then
    insert into public.training_assignment_rules (training_module_id, target_role, target_department_id, job_title_id, is_active)
    select v_housekeeping, null, v_dept_housekeeping, null, true
    where not exists (
      select 1 from public.training_assignment_rules
      where training_module_id = v_housekeeping
        and target_role is null
        and target_department_id = v_dept_housekeeping
        and job_title_id is null
    );
  end if;

  if v_dept_security is not null and v_safety is not null then
    insert into public.training_assignment_rules (training_module_id, target_role, target_department_id, job_title_id, is_active)
    select v_safety, null, v_dept_security, null, true
    where not exists (
      select 1 from public.training_assignment_rules
      where training_module_id = v_safety
        and target_role is null
        and target_department_id = v_dept_security
        and job_title_id is null
    );
  end if;

  if v_job_night_auditor is not null and v_night_audit is not null then
    insert into public.training_assignment_rules (training_module_id, target_role, target_department_id, job_title_id, is_active)
    select v_night_audit, null, null, v_job_night_auditor, true
    where not exists (
      select 1 from public.training_assignment_rules
      where training_module_id = v_night_audit
        and target_role is null
        and target_department_id is null
        and job_title_id = v_job_night_auditor
    );
  end if;

  -- Update onboarding workflow training step to use a valid module_id
  select id into v_workflow_onboard
  from public.workflow_definitions
  where name = 'Onboarding Workflow' and is_deleted = false
  limit 1;

  if v_workflow_onboard is not null and v_hospitality is not null then
    update public.workflow_steps
    set config = jsonb_set(coalesce(config, '{}'::jsonb) - 'training_module_id', '{module_id}', to_jsonb(v_hospitality::text), true)
    where workflow_id = v_workflow_onboard
      and action = 'assign_training';
  end if;

  -- Ensure Welcome Pack workflow exists
  select id into v_workflow_welcome
  from public.workflow_definitions
  where name = 'New Hire Welcome Pack' and is_deleted = false
  limit 1;

  -- Starter workflow: Front Office Training Pack
  select id into v_workflow_front
  from public.workflow_definitions
  where name = 'Front Office Training Pack' and is_deleted = false
  limit 1;

  if v_workflow_front is null then
    insert into public.workflow_definitions (name, description, type, trigger_config, action_config, is_active)
    values (
      'Front Office Training Pack',
      'Assign core front office training and create a shadow shift task.',
      'event-based',
      jsonb_build_object('event', 'ROLE_CHANGE', 'department', 'Front Office'),
      '{}'::jsonb,
      true
    )
    returning id into v_workflow_front;
  end if;

  if v_workflow_front is not null and not exists (
    select 1 from public.workflow_steps where workflow_id = v_workflow_front
  ) then
    insert into public.workflow_steps (workflow_id, step_order, name, action, config)
    values
      (v_workflow_front, 1, 'Notify Front Office Welcome', 'send_notification', jsonb_build_object(
        'title', 'Front Office Training Assigned',
        'message', 'Welcome to Front Office. Please complete your training and schedule a shadow shift.'
      )),
      (v_workflow_front, 2, 'Assign Guest Check-In Training', 'assign_training', jsonb_build_object(
        'module_id', v_guest
      )),
      (v_workflow_front, 3, 'Create Shadow Shift Task', 'create_task', jsonb_build_object(
        'title', 'Schedule Shadow Shift',
        'description', 'Coordinate a shadow shift with the Front Office supervisor.',
        'priority', 'high'
      ));
  end if;

  -- Starter workflow: Housekeeping Starter Pack
  select id into v_workflow_house
  from public.workflow_definitions
  where name = 'Housekeeping Starter Pack' and is_deleted = false
  limit 1;

  if v_workflow_house is null then
    insert into public.workflow_definitions (name, description, type, trigger_config, action_config, is_active)
    values (
      'Housekeeping Starter Pack',
      'Assign housekeeping standards training and set a room readiness task.',
      'event-based',
      jsonb_build_object('event', 'ROLE_CHANGE', 'department', 'Housekeeping'),
      '{}'::jsonb,
      true
    )
    returning id into v_workflow_house;
  end if;

  if v_workflow_house is not null and not exists (
    select 1 from public.workflow_steps where workflow_id = v_workflow_house
  ) then
    insert into public.workflow_steps (workflow_id, step_order, name, action, config)
    values
      (v_workflow_house, 1, 'Notify Housekeeping Welcome', 'send_notification', jsonb_build_object(
        'title', 'Housekeeping Starter Pack',
        'message', 'Please complete the housekeeping standards training and review room readiness.'
      )),
      (v_workflow_house, 2, 'Assign Housekeeping Training', 'assign_training', jsonb_build_object(
        'module_id', v_housekeeping
      )),
      (v_workflow_house, 3, 'Create Room Readiness Task', 'create_task', jsonb_build_object(
        'title', 'Room Standards Walkthrough',
        'description', 'Complete a walkthrough with your supervisor and review the room standards checklist.',
        'priority', 'medium'
      ));
  end if;

  -- Trigger rules for starter workflows and auto training
  if v_workflow_welcome is not null then
    insert into public.trigger_rules (event_type, name, description, conditions, action_type, action_config, is_active)
    select 'NEW_HIRE', 'Starter Pack: New Hire Welcome', 'Start the Welcome Pack workflow for new hires.', '[]'::jsonb,
           'start_workflow', jsonb_build_object('workflow_id', v_workflow_welcome), true
    where not exists (
      select 1 from public.trigger_rules where name = 'Starter Pack: New Hire Welcome'
    );
  end if;

  if v_workflow_front is not null and v_dept_front is not null then
    insert into public.trigger_rules (event_type, name, description, conditions, action_type, action_config, is_active)
    select 'ROLE_CHANGE', 'Starter Pack: Front Office Training', 'Launch front office training workflow on role change.',
           jsonb_build_array(jsonb_build_object('field', 'department_id', 'operator', 'equals', 'value', v_dept_front)),
           'start_workflow', jsonb_build_object('workflow_id', v_workflow_front), true
    where not exists (
      select 1 from public.trigger_rules where name = 'Starter Pack: Front Office Training'
    );
  end if;

  if v_workflow_house is not null and v_dept_housekeeping is not null then
    insert into public.trigger_rules (event_type, name, description, conditions, action_type, action_config, is_active)
    select 'ROLE_CHANGE', 'Starter Pack: Housekeeping Training', 'Launch housekeeping training workflow on role change.',
           jsonb_build_array(jsonb_build_object('field', 'department_id', 'operator', 'equals', 'value', v_dept_housekeeping)),
           'start_workflow', jsonb_build_object('workflow_id', v_workflow_house), true
    where not exists (
      select 1 from public.trigger_rules where name = 'Starter Pack: Housekeeping Training'
    );
  end if;

  if v_dept_maintenance is not null and v_safety is not null then
    insert into public.trigger_rules (event_type, name, description, conditions, action_type, action_config, is_active)
    select 'ROLE_CHANGE', 'Starter Pack: Maintenance Safety Training', 'Assign safety training when maintenance role changes.',
           jsonb_build_array(jsonb_build_object('field', 'department_id', 'operator', 'equals', 'value', v_dept_maintenance)),
           'assign_training', jsonb_build_object('target_id', v_safety, 'due_days', 14), true
    where not exists (
      select 1 from public.trigger_rules where name = 'Starter Pack: Maintenance Safety Training'
    );
  end if;

  -- Recurring task templates (starter pack)
  if v_hq_property is not null then
    insert into public.task_templates (title, description, priority, recurrence_type, recurrence_config, property_id, department_id, is_active, next_run_at)
    select 'Daily Housekeeping Room Readiness', 'Verify room readiness checklist for assigned floors.', 'medium', 'daily', '{}'::jsonb,
           v_hq_property, v_dept_housekeeping, true,
           public.calculate_next_task_run('daily', now())
    where not exists (
      select 1 from public.task_templates where title = 'Daily Housekeeping Room Readiness'
    );

    insert into public.task_templates (title, description, priority, recurrence_type, recurrence_config, property_id, department_id, is_active, next_run_at)
    select 'Weekly Front Office Cash Count', 'Perform weekly cash count and reconciliation for the front desk.', 'high', 'weekly', '{}'::jsonb,
           v_hq_property, v_dept_front, true,
           public.calculate_next_task_run('weekly', now())
    where not exists (
      select 1 from public.task_templates where title = 'Weekly Front Office Cash Count'
    );

    insert into public.task_templates (title, description, priority, recurrence_type, recurrence_config, property_id, department_id, is_active, next_run_at)
    select 'Monthly Safety Drill Review', 'Review safety drill readiness and update compliance checklist.', 'medium', 'monthly', '{}'::jsonb,
           v_hq_property, v_dept_security, true,
           public.calculate_next_task_run('monthly', now())
    where not exists (
      select 1 from public.task_templates where title = 'Monthly Safety Drill Review'
    );
  end if;
end $$;
;
