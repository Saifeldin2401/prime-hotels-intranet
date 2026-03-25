begin;

create temporary table tmp_seed_context on commit drop as
select 'a927ec40-0af0-47d7-8258-9decad0cac9c'::uuid as created_by;

create temporary table tmp_department_groups on commit drop as
select 'front_office'::text as group_key, id as department_id
from public.departments
where name in ('Front Office', 'Front Office Operations', 'Guest Relations & Concierge')
union all
select 'housekeeping'::text, id
from public.departments
where name in ('Housekeeping', 'Housekeeping & Laundry')
union all
select 'finance'::text, id
from public.departments
where name in ('Finance', 'Finance / Accounting', 'Finance, Accounting & Purchasing')
union all
select 'engineering'::text, id
from public.departments
where name in ('Engineering', 'Engineering & Maintenance', 'Maintenance')
union all
select 'security'::text, id
from public.departments
where name in ('Security', 'Security & Safety');

insert into public.workflow_definitions (
  id, name, description, type, trigger_config, action_config, is_active, created_by, is_deleted
)
select
  seed.id,
  seed.name,
  seed.description,
  'event-based',
  seed.trigger_config,
  '{}'::jsonb,
  true,
  ctx.created_by,
  false
from (
  values
    ('b904d90e-6e5f-45dc-8f46-492ed4aaf527'::uuid, 'Front Office Training Pack', 'Welcome workflow for Front Office role changes with notification and operational shadow-shift follow-up.', jsonb_build_object('event', 'ROLE_CHANGE', 'department_group', 'front_office')),
    ('35e93fb7-cd16-427d-baf0-96d23976b5b6'::uuid, 'Housekeeping Starter Pack', 'Welcome workflow for Housekeeping role changes with notification and room-readiness walkthrough follow-up.', jsonb_build_object('event', 'ROLE_CHANGE', 'department_group', 'housekeeping')),
    ('b96dbe84-f50d-437b-82d2-39c09b63828c'::uuid, 'New Hire Welcome Pack', 'Welcome workflow for new staff with onboarding guidance and profile setup follow-up.', jsonb_build_object('event', 'NEW_HIRE')),
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Onboarding Workflow', 'Standard onboarding sequence for new hires with training assignment and HR documentation task.', jsonb_build_object('event', 'NEW_HIRE')),
    ('64000000-0000-4000-8000-000000000001'::uuid, 'Finance Controls Starter Pack', 'Starter pack for Finance role changes with control walkthrough follow-up.', jsonb_build_object('event', 'ROLE_CHANGE', 'department_group', 'finance')),
    ('64000000-0000-4000-8000-000000000002'::uuid, 'Engineering Starter Pack', 'Starter pack for Engineering role changes with preventive maintenance walkthrough follow-up.', jsonb_build_object('event', 'ROLE_CHANGE', 'department_group', 'engineering')),
    ('64000000-0000-4000-8000-000000000003'::uuid, 'Security Starter Pack', 'Starter pack for Security role changes with incident response field coaching follow-up.', jsonb_build_object('event', 'ROLE_CHANGE', 'department_group', 'security'))
) as seed (id, name, description, trigger_config)
cross join tmp_seed_context ctx
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  type = excluded.type,
  trigger_config = excluded.trigger_config,
  action_config = excluded.action_config,
  is_active = excluded.is_active,
  created_by = excluded.created_by,
  is_deleted = false,
  updated_at = timezone('utc', now());

delete from public.workflow_steps
where workflow_id in (
  'b904d90e-6e5f-45dc-8f46-492ed4aaf527'::uuid,
  '35e93fb7-cd16-427d-baf0-96d23976b5b6'::uuid,
  'b96dbe84-f50d-437b-82d2-39c09b63828c'::uuid,
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  '64000000-0000-4000-8000-000000000001'::uuid,
  '64000000-0000-4000-8000-000000000002'::uuid,
  '64000000-0000-4000-8000-000000000003'::uuid
);

insert into public.workflow_steps (id, workflow_id, step_order, name, action, config)
select gen_random_uuid(), seed.workflow_id, seed.step_order, seed.name, seed.action, seed.config
from (
  values
    ('b904d90e-6e5f-45dc-8f46-492ed4aaf527'::uuid, 1, 'Notify Front Office Welcome', 'send_notification', jsonb_build_object('type', 'system', 'title', 'Front Office Starter Pack', 'message', 'Welcome to Front Office. Review your assigned training and schedule your shadow shift with the supervisor.')),
    ('b904d90e-6e5f-45dc-8f46-492ed4aaf527'::uuid, 2, 'Create Shadow Shift Task', 'create_task', jsonb_build_object('title', 'Complete Front Office shadow shift', 'priority', 'high', 'description', 'Complete one supervised shadow shift covering arrival, room change, and checkout scenarios.')),
    ('35e93fb7-cd16-427d-baf0-96d23976b5b6'::uuid, 1, 'Notify Housekeeping Welcome', 'send_notification', jsonb_build_object('type', 'system', 'title', 'Housekeeping Starter Pack', 'message', 'Welcome to Housekeeping. Review the room turnover module and complete a room-readiness walkthrough with your supervisor.')),
    ('35e93fb7-cd16-427d-baf0-96d23976b5b6'::uuid, 2, 'Create Room Walkthrough Task', 'create_task', jsonb_build_object('title', 'Complete room readiness walkthrough', 'priority', 'medium', 'description', 'Walk one full room turnover with the supervisor and review room-release checkpoints.')),
    ('b96dbe84-f50d-437b-82d2-39c09b63828c'::uuid, 1, 'Send Welcome Notification', 'send_notification', jsonb_build_object('type', 'system', 'title', 'Welcome to Prime Hotels', 'message', 'Welcome aboard. Review your profile, core policies, and onboarding checklist today.')),
    ('b96dbe84-f50d-437b-82d2-39c09b63828c'::uuid, 2, 'Create Profile Setup Task', 'create_task', jsonb_build_object('title', 'Complete employee profile setup', 'priority', 'medium', 'description', 'Verify profile data, emergency contact, language preference, and personal details.')),
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 1, 'Send Onboarding Notification', 'send_notification', jsonb_build_object('type', 'system', 'title', 'Onboarding workflow started', 'message', 'Complete your HR onboarding module and submit all required employment documents.')),
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 2, 'Assign HR Onboarding Training', 'assign_training', jsonb_build_object('module_id', '61000000-0000-4000-8000-000000000001')),
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 3, 'Create HR Documents Task', 'create_task', jsonb_build_object('title', 'Submit HR onboarding documents', 'priority', 'high', 'description', 'Submit signed contract, identity documents, bank details, and policy acknowledgements.')),
    ('64000000-0000-4000-8000-000000000001'::uuid, 1, 'Notify Finance Welcome', 'send_notification', jsonb_build_object('type', 'system', 'title', 'Finance Starter Pack', 'message', 'Review the cash handling module and complete your controls walkthrough with Finance leadership.')),
    ('64000000-0000-4000-8000-000000000001'::uuid, 2, 'Create Cash Control Walkthrough Task', 'create_task', jsonb_build_object('title', 'Complete cash-control walkthrough', 'priority', 'high', 'description', 'Review float count, refund approval, drop-safe, and audit packet controls with your supervisor.')),
    ('64000000-0000-4000-8000-000000000002'::uuid, 1, 'Notify Engineering Welcome', 'send_notification', jsonb_build_object('type', 'system', 'title', 'Engineering Starter Pack', 'message', 'Review the preventive maintenance module and complete a live PM walkthrough with the Chief Engineer or delegate.')),
    ('64000000-0000-4000-8000-000000000002'::uuid, 2, 'Create PM Walkthrough Task', 'create_task', jsonb_build_object('title', 'Complete preventive maintenance walkthrough', 'priority', 'high', 'description', 'Walk a preventive maintenance task, document readings, and close the work order correctly.')),
    ('64000000-0000-4000-8000-000000000003'::uuid, 1, 'Notify Security Welcome', 'send_notification', jsonb_build_object('type', 'system', 'title', 'Security Starter Pack', 'message', 'Review the incident response module and complete a field response briefing with the Security Supervisor.')),
    ('64000000-0000-4000-8000-000000000003'::uuid, 2, 'Create Incident Response Drill Task', 'create_task', jsonb_build_object('title', 'Complete incident response field drill', 'priority', 'high', 'description', 'Review scene control, radio escalation, incident report standards, and evidence preservation with Security leadership.'))
) as seed (workflow_id, step_order, name, action, config);

insert into public.trigger_rules (
  id, event_type, name, description, conditions, action_type, action_config, is_active, created_by
)
select
  seed.id,
  seed.event_type,
  seed.name,
  seed.description,
  seed.conditions,
  'start_workflow',
  jsonb_build_object('workflow_id', seed.workflow_id::text),
  true,
  ctx.created_by
from (
  values
    (
      '577abc32-f3be-4c58-8072-14749b2734f5'::uuid,
      'NEW_HIRE',
      'Starter Pack: New Hire Welcome',
      'Start the core onboarding workflow for new hires.',
      '550e8400-e29b-41d4-a716-446655440000'::uuid,
      '[]'::jsonb
    ),
    (
      '65000000-0000-4000-8000-000000000006'::uuid,
      'NEW_HIRE',
      'Starter Pack: Welcome Communications',
      'Start the welcome communications pack for new hires.',
      'b96dbe84-f50d-437b-82d2-39c09b63828c'::uuid,
      '[]'::jsonb
    ),
    (
      '65000000-0000-4000-8000-000000000001'::uuid,
      'ROLE_CHANGE',
      'Starter Pack: Front Office Role Change',
      'Start the Front Office starter pack when a user moves into the Front Office group.',
      'b904d90e-6e5f-45dc-8f46-492ed4aaf527'::uuid,
      jsonb_build_array(jsonb_build_object('field', 'department_id', 'operator', 'in', 'value', (select coalesce(jsonb_agg(department_id::text order by department_id), '[]'::jsonb) from tmp_department_groups where group_key = 'front_office')))
    ),
    (
      '65000000-0000-4000-8000-000000000002'::uuid,
      'ROLE_CHANGE',
      'Starter Pack: Housekeeping Role Change',
      'Start the Housekeeping starter pack when a user moves into the Housekeeping group.',
      '35e93fb7-cd16-427d-baf0-96d23976b5b6'::uuid,
      jsonb_build_array(jsonb_build_object('field', 'department_id', 'operator', 'in', 'value', (select coalesce(jsonb_agg(department_id::text order by department_id), '[]'::jsonb) from tmp_department_groups where group_key = 'housekeeping')))
    ),
    (
      '65000000-0000-4000-8000-000000000003'::uuid,
      'ROLE_CHANGE',
      'Starter Pack: Finance Role Change',
      'Start the Finance starter pack when a user moves into the Finance group.',
      '64000000-0000-4000-8000-000000000001'::uuid,
      jsonb_build_array(jsonb_build_object('field', 'department_id', 'operator', 'in', 'value', (select coalesce(jsonb_agg(department_id::text order by department_id), '[]'::jsonb) from tmp_department_groups where group_key = 'finance')))
    ),
    (
      '65000000-0000-4000-8000-000000000004'::uuid,
      'ROLE_CHANGE',
      'Starter Pack: Engineering Role Change',
      'Start the Engineering starter pack when a user moves into the Engineering or Maintenance group.',
      '64000000-0000-4000-8000-000000000002'::uuid,
      jsonb_build_array(jsonb_build_object('field', 'department_id', 'operator', 'in', 'value', (select coalesce(jsonb_agg(department_id::text order by department_id), '[]'::jsonb) from tmp_department_groups where group_key = 'engineering')))
    ),
    (
      '65000000-0000-4000-8000-000000000005'::uuid,
      'ROLE_CHANGE',
      'Starter Pack: Security Role Change',
      'Start the Security starter pack when a user moves into the Security group.',
      '64000000-0000-4000-8000-000000000003'::uuid,
      jsonb_build_array(jsonb_build_object('field', 'department_id', 'operator', 'in', 'value', (select coalesce(jsonb_agg(department_id::text order by department_id), '[]'::jsonb) from tmp_department_groups where group_key = 'security')))
    )
) as seed (id, event_type, name, description, workflow_id, conditions)
cross join tmp_seed_context ctx
on conflict (id) do update
set
  event_type = excluded.event_type,
  name = excluded.name,
  description = excluded.description,
  conditions = excluded.conditions,
  action_type = excluded.action_type,
  action_config = excluded.action_config,
  is_active = excluded.is_active,
  created_by = excluded.created_by;

commit;
