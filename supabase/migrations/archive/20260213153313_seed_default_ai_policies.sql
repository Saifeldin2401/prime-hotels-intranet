begin;

-- default_workflow
insert into ai_policy_versions (policy_set_id, version, policy_json, status)
select s.id,
       'v1.0.0',
       jsonb_build_object(
         'schema_version','1.0',
         'routing_rules', jsonb_build_array(
           jsonb_build_object('entity_type','leave_request','sequence',jsonb_build_array('supervisor','hr'),'max_hours',48)
         ),
         'escalation_rules', jsonb_build_array(
           jsonb_build_object('entity_type','leave_request','after_hours',48,'target_role','regional_hr')
         ),
         'parallel_stages', jsonb_build_object('enabled', true, 'roles', jsonb_build_array('property_manager','department_head'))
       ),
       'active'
from ai_policy_sets s
where s.name = 'default_workflow'
  and not exists (
    select 1 from ai_policy_versions v where v.policy_set_id = s.id
  );

update ai_policy_sets s
set active_version_id = v.id
from ai_policy_versions v
where s.name = 'default_workflow'
  and v.policy_set_id = s.id
  and s.active_version_id is null;

-- default_task
insert into ai_policy_versions (policy_set_id, version, policy_json, status)
select s.id,
       'v1.0.0',
       jsonb_build_object(
         'schema_version','1.0',
         'reprioritize_rules', jsonb_build_object('overdue_multiplier', 1.5),
         'reassignment_rules', jsonb_build_object('max_load_per_user', 25),
         'escalation_rules', jsonb_build_object('overdue_hours', 24)
       ),
       'active'
from ai_policy_sets s
where s.name = 'default_task'
  and not exists (
    select 1 from ai_policy_versions v where v.policy_set_id = s.id
  );

update ai_policy_sets s
set active_version_id = v.id
from ai_policy_versions v
where s.name = 'default_task'
  and v.policy_set_id = s.id
  and s.active_version_id is null;

-- default_delegation
insert into ai_policy_versions (policy_set_id, version, policy_json, status)
select s.id,
       'v1.0.0',
       jsonb_build_object(
         'schema_version','1.0',
         'absence_detection', jsonb_build_object('threshold_hours', 12),
         'delegate_selection', jsonb_build_object('strategy','least_loaded')
       ),
       'active'
from ai_policy_sets s
where s.name = 'default_delegation'
  and not exists (
    select 1 from ai_policy_versions v where v.policy_set_id = s.id
  );

update ai_policy_sets s
set active_version_id = v.id
from ai_policy_versions v
where s.name = 'default_delegation'
  and v.policy_set_id = s.id
  and s.active_version_id is null;

-- default_routing
insert into ai_policy_versions (policy_set_id, version, policy_json, status)
select s.id,
       'v1.0.0',
       jsonb_build_object(
         'schema_version','1.0',
         'routing_rules', jsonb_build_array(),
         'escalation_rules', jsonb_build_array()
       ),
       'active'
from ai_policy_sets s
where s.name = 'default_routing'
  and not exists (
    select 1 from ai_policy_versions v where v.policy_set_id = s.id
  );

update ai_policy_sets s
set active_version_id = v.id
from ai_policy_versions v
where s.name = 'default_routing'
  and v.policy_set_id = s.id
  and s.active_version_id is null;

-- default_sla
insert into ai_policy_versions (policy_set_id, version, policy_json, status)
select s.id,
       'v1.0.0',
       jsonb_build_object(
         'schema_version','1.0',
         'sla_targets', jsonb_build_array()
       ),
       'active'
from ai_policy_sets s
where s.name = 'default_sla'
  and not exists (
    select 1 from ai_policy_versions v where v.policy_set_id = s.id
  );

update ai_policy_sets s
set active_version_id = v.id
from ai_policy_versions v
where s.name = 'default_sla'
  and v.policy_set_id = s.id
  and s.active_version_id is null;

-- default_optimization
insert into ai_policy_versions (policy_set_id, version, policy_json, status)
select s.id,
       'v1.0.0',
       jsonb_build_object(
         'schema_version','1.0',
         'allowed_changes', jsonb_build_array('adjust_escalation_hours','enable_parallel_stage'),
         'risk_limits', jsonb_build_object('max_risk_score', 0.3)
       ),
       'active'
from ai_policy_sets s
where s.name = 'default_optimization'
  and not exists (
    select 1 from ai_policy_versions v where v.policy_set_id = s.id
  );

update ai_policy_sets s
set active_version_id = v.id
from ai_policy_versions v
where s.name = 'default_optimization'
  and v.policy_set_id = s.id
  and s.active_version_id is null;

commit;;
