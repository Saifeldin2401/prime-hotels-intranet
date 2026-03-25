begin;

create temporary table tmp_seed_context on commit drop as
select
  'a927ec40-0af0-47d7-8258-9decad0cac9c'::uuid as created_by,
  '739771e0-08ff-4e07-992f-d2be1770aa59'::uuid as headquarters_property_id,
  '00000000-0000-0000-0000-000000000001'::uuid as front_office_department_id,
  '00000000-0000-0000-0000-000000000002'::uuid as housekeeping_department_id,
  '00000000-0000-0000-0000-000000000005'::uuid as hr_department_id,
  '00000000-0000-0000-0000-000000000006'::uuid as finance_department_id,
  '00000000-0000-0000-0000-000000000004'::uuid as engineering_department_id,
  '00000000-0000-0000-0000-000000000007'::uuid as security_department_id,
  '00000000-0000-0000-0000-000000000009'::uuid as it_department_id;

create temporary table tmp_department_groups on commit drop as
select 'front_office'::text as group_key, id as department_id
from public.departments
where name in ('Front Office', 'Front Office Operations', 'Guest Relations & Concierge')
union all
select 'housekeeping'::text, id
from public.departments
where name in ('Housekeeping', 'Housekeeping & Laundry')
union all
select 'hr'::text, id
from public.departments
where name in ('HR', 'Human Resources', 'Human Resources & Training')
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
where name in ('Security', 'Security & Safety')
union all
select 'it'::text, id
from public.departments
where name in ('IT', 'IT Systems & PMS');

insert into public.training_modules (
  id,
  title,
  description,
  estimated_duration_minutes,
  created_by,
  updated_by,
  property_id,
  category,
  status,
  difficulty_level,
  estimated_duration,
  is_active,
  department_id,
  validity_period_days,
  certificate_enabled,
  allow_retake,
  max_attempts,
  auto_advance,
  show_feedback,
  randomize_questions,
  show_answers,
  time_limit_minutes,
  audience,
  content_language,
  passing_score_percentage,
  is_deleted
)
select
  seed.id,
  seed.title,
  seed.description,
  seed.estimated_duration_minutes,
  ctx.created_by,
  ctx.created_by,
  null,
  seed.category,
  'completed',
  seed.difficulty_level,
  seed.estimated_duration,
  true,
  case seed.department_key
    when 'front_office' then ctx.front_office_department_id
    when 'housekeeping' then ctx.housekeeping_department_id
    when 'hr' then ctx.hr_department_id
    when 'finance' then ctx.finance_department_id
    when 'engineering' then ctx.engineering_department_id
    when 'security' then ctx.security_department_id
    when 'it' then ctx.it_department_id
    else null
  end,
  seed.validity_period_days,
  true,
  true,
  3,
  true,
  true,
  false,
  true,
  seed.time_limit_minutes,
  seed.audience,
  'en',
  seed.passing_score_percentage,
  false
from (
  values
    ('5d54ecee-7731-4b83-adf3-14b795eaa092'::uuid, 'Guest Rights and Stay Disclosure', 'Front Office compliance training covering guest rights, reservation transparency, confidentiality, and disclosure standards during arrival.', 35, 'operations', 'intermediate', '35 minutes', 'front_office', 365, 25, 'Front Office, Guest Relations, and Duty Managers'),
    ('2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'Front Office: Check-in & Checkout', 'End-to-end arrival and departure standards for Front Office teams, including verification, room readiness, guest communication, folio controls, and service recovery.', 45, 'operations', 'intermediate', '45 minutes', 'front_office', 365, 30, 'Front Office, Duty Managers, and Guest Relations'),
    ('61000000-0000-4000-8000-000000000001'::uuid, 'HR: New Hire Onboarding Essentials', 'Operational onboarding module for new hotel staff covering documents, access setup, conduct expectations, and probation milestones.', 40, 'onboarding', 'beginner', '40 minutes', 'hr', 365, 25, 'New hires, HR teams, and department heads'),
    ('61000000-0000-4000-8000-000000000002'::uuid, 'Housekeeping: Room Turnover SOP', 'Room turnover standards for housekeeping teams covering cleaning sequence, room readiness, lost and found, and defect escalation.', 45, 'operations', 'intermediate', '45 minutes', 'housekeeping', 365, 30, 'Housekeeping attendants, supervisors, and laundry leads'),
    ('61000000-0000-4000-8000-000000000003'::uuid, 'Emergency: Fire & Evacuation Procedures', 'Group-wide emergency response training focused on alarm response, evacuation control, accountability, and incident closure.', 30, 'compliance', 'beginner', '30 minutes', null, 365, 20, 'All staff'),
    ('61000000-0000-4000-8000-000000000004'::uuid, 'IT: Cybersecurity Awareness', 'Practical cyber hygiene for hotel staff covering phishing, password handling, workstation controls, and secure guest data handling.', 30, 'technology', 'beginner', '30 minutes', 'it', 365, 20, 'All staff, with extra relevance for FO, HR, Finance, and IT'),
    ('61000000-0000-4000-8000-000000000005'::uuid, 'Finance: Cash Handling & Night Audit', 'Daily cashiering and audit controls for finance, front office cashiers, and night audit teams.', 40, 'finance', 'intermediate', '40 minutes', 'finance', 365, 25, 'Finance, cashiers, night auditors, and duty managers'),
    ('61000000-0000-4000-8000-000000000006'::uuid, 'Engineering: Preventive Maintenance Walkthrough', 'Preventive maintenance execution standards including safe isolation, coordination with operations, work order closure, and fault escalation.', 40, 'engineering', 'intermediate', '40 minutes', 'engineering', 365, 25, 'Engineering, maintenance technicians, and facilities supervisors'),
    ('61000000-0000-4000-8000-000000000007'::uuid, 'Security: Incident Response & Reporting', 'Operational incident response standards for security teams, including scene control, evidence protection, key control, and reporting discipline.', 35, 'security', 'intermediate', '35 minutes', 'security', 365, 25, 'Security officers, safety marshals, and duty managers')
) as seed (
  id,
  title,
  description,
  estimated_duration_minutes,
  category,
  difficulty_level,
  estimated_duration,
  department_key,
  validity_period_days,
  time_limit_minutes,
  audience
)
cross join tmp_seed_context ctx
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  estimated_duration_minutes = excluded.estimated_duration_minutes,
  updated_by = excluded.updated_by,
  updated_at = timezone('utc', now()),
  category = excluded.category,
  status = excluded.status,
  difficulty_level = excluded.difficulty_level,
  estimated_duration = excluded.estimated_duration,
  is_active = excluded.is_active,
  department_id = excluded.department_id,
  validity_period_days = excluded.validity_period_days,
  certificate_enabled = excluded.certificate_enabled,
  allow_retake = excluded.allow_retake,
  max_attempts = excluded.max_attempts,
  auto_advance = excluded.auto_advance,
  show_feedback = excluded.show_feedback,
  randomize_questions = excluded.randomize_questions,
  show_answers = excluded.show_answers,
  time_limit_minutes = excluded.time_limit_minutes,
  audience = excluded.audience,
  content_language = excluded.content_language,
  passing_score_percentage = excluded.passing_score_percentage,
  is_deleted = false;

insert into public.quizzes (
  id,
  title,
  description,
  duration_minutes,
  passing_score,
  status,
  created_by,
  property_id,
  training_id
)
select
  seed.id,
  seed.title,
  seed.description,
  seed.duration_minutes,
  seed.passing_score,
  'published',
  ctx.created_by,
  null,
  seed.training_id
from (
  values
    ('d69624ad-b02f-4030-b653-f018d6271e8b'::uuid, 'Guest Rights and Stay Disclosure Knowledge Check', 'Quiz validating guest rights disclosure compliance and reservation transparency handling.', 15, 80, '5d54ecee-7731-4b83-adf3-14b795eaa092'::uuid),
    ('508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid, 'Front Office Check-in & Checkout Operational Quiz', 'Quiz validating arrival, room readiness, key control, folio review, and privacy handling at the desk.', 18, 80, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid),
    ('63000000-0000-4000-8000-000000000001'::uuid, 'HR New Hire Onboarding Essentials Quiz', 'Quiz validating onboarding readiness, documentation, access control, and policy acknowledgement steps.', 15, 80, '61000000-0000-4000-8000-000000000001'::uuid),
    ('63000000-0000-4000-8000-000000000002'::uuid, 'Housekeeping Room Turnover Quiz', 'Quiz validating room cleaning sequence, room release criteria, lost and found, and maintenance escalation.', 15, 80, '61000000-0000-4000-8000-000000000002'::uuid),
    ('63000000-0000-4000-8000-000000000003'::uuid, 'Emergency Fire & Evacuation Quiz', 'Quiz validating fire response, evacuation priorities, accountability, and post-incident reporting.', 12, 85, '61000000-0000-4000-8000-000000000003'::uuid),
    ('63000000-0000-4000-8000-000000000004'::uuid, 'Cybersecurity Awareness Quiz', 'Quiz validating phishing detection, password hygiene, workstation security, and secure guest data handling.', 12, 85, '61000000-0000-4000-8000-000000000004'::uuid),
    ('63000000-0000-4000-8000-000000000005'::uuid, 'Cash Handling & Night Audit Quiz', 'Quiz validating float control, discrepancies, refund approvals, documentation, and reconciliation discipline.', 15, 85, '61000000-0000-4000-8000-000000000005'::uuid),
    ('63000000-0000-4000-8000-000000000006'::uuid, 'Preventive Maintenance Walkthrough Quiz', 'Quiz validating safe maintenance execution, work order closure, coordination, and fault escalation.', 15, 85, '61000000-0000-4000-8000-000000000006'::uuid),
    ('63000000-0000-4000-8000-000000000007'::uuid, 'Incident Response & Reporting Quiz', 'Quiz validating scene control, evidence handling, key security, and incident documentation.', 15, 85, '61000000-0000-4000-8000-000000000007'::uuid)
) as seed (id, title, description, duration_minutes, passing_score, training_id)
cross join tmp_seed_context ctx
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  duration_minutes = excluded.duration_minutes,
  passing_score = excluded.passing_score,
  status = excluded.status,
  created_by = excluded.created_by,
  property_id = excluded.property_id,
  training_id = excluded.training_id,
  updated_at = timezone('utc', now());

update public.training_content_blocks
set content_data = jsonb_build_object('quiz_id', 'd69624ad-b02f-4030-b653-f018d6271e8b')
where training_module_id = '5d54ecee-7731-4b83-adf3-14b795eaa092'
  and type = 'quiz';

delete from public.training_content_blocks
where training_module_id in (
  '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid,
  '61000000-0000-4000-8000-000000000001'::uuid,
  '61000000-0000-4000-8000-000000000002'::uuid,
  '61000000-0000-4000-8000-000000000003'::uuid,
  '61000000-0000-4000-8000-000000000004'::uuid,
  '61000000-0000-4000-8000-000000000005'::uuid,
  '61000000-0000-4000-8000-000000000006'::uuid,
  '61000000-0000-4000-8000-000000000007'::uuid
);

insert into public.training_content_blocks (
  id,
  training_module_id,
  type,
  content,
  "order",
  created_at,
  content_data,
  is_mandatory,
  is_deleted,
  source_document_id,
  title,
  duration_seconds,
  points
)
select
  gen_random_uuid(),
  seed.training_module_id,
  seed.block_type::public.content_block_type,
  seed.content,
  seed.block_order,
  timezone('utc', now()),
  case
    when seed.block_type = 'quiz' then jsonb_build_object('quiz_id', seed.quiz_id::text)
    when seed.block_type = 'sop_reference' then jsonb_build_object('sop_id', seed.source_document_id::text)
    else '{}'::jsonb
  end,
  true,
  false,
  seed.source_document_id,
  seed.title,
  seed.duration_seconds,
  seed.points
from (
  values
    ('2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'text', 'Arrival standards and learning outcomes', $$This module aligns Front Office teams on a consistent arrival and departure sequence. Staff must verify reservation data, protect guest privacy, control key issuance, explain room and rate details clearly, and close the folio accurately before departure.$$ , 0, null::uuid, null::uuid, 360, 10),
    ('2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'sop_reference', 'Check-in and checkout SOP reference', $$Review the linked SOP before attempting the operational quiz. Supervisors should coach agents on the exact sequence, not just the destination result.$$ , 1, 'a1000001-0000-0000-0000-000000000001'::uuid, null::uuid, 420, 10),
    ('2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'text', 'Arrival verification sequence', $$Before a key is issued, confirm identity, reservation details, payment guarantee, room readiness, and special requests. If any item is incomplete, pause the sequence and explain the next step to the guest instead of improvising.$$ , 2, null::uuid, null::uuid, 300, 10),
    ('2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'text', 'Departure control points', $$At checkout, review the folio line by line, verify unsettled postings, confirm the guest's preferred settlement method, and close the room cleanly in the PMS. Disputes must be documented and escalated with evidence, not solved by guesswork.$$ , 3, null::uuid, null::uuid, 300, 10),
    ('2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'text', 'Privacy and service recovery', $$Never announce room numbers or rate details loudly in a crowded lobby. Handle delays, early arrivals, room moves, and disputed charges with clear explanations, alternatives, and immediate supervisor escalation when revenue or guest security is at risk.$$ , 4, null::uuid, null::uuid, 300, 10),
    ('2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'quiz', 'Front Office check-in and checkout assessment', $$Complete the final operational quiz. Staff must pass before the module is marked complete and a certificate is generated.$$ , 5, null::uuid, '508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid, 180, 20),
    ('61000000-0000-4000-8000-000000000001'::uuid, 'text', 'Onboarding scope', $$This module prepares new hires and their managers for a clean Day 1 start. The goal is to make every onboarding file auditable, every access request controlled, and every probation expectation clear.$$ , 0, null::uuid, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000001'::uuid, 'sop_reference', 'Employee onboarding SOP', $$Use the onboarding SOP as the single source for document collection, induction sequencing, and probation checkpoints.$$ , 1, 'a1000006-0000-0000-0000-000000000001'::uuid, null::uuid, 360, 10),
    ('61000000-0000-4000-8000-000000000001'::uuid, 'text', 'Day 1 controls', $$Do not release system access, payroll setup, or full scheduling until identity, contract paperwork, policy acknowledgement, and reporting lines are confirmed. Missing documents are escalated, not ignored.$$ , 2, null::uuid, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000001'::uuid, 'text', 'Probation and conduct expectations', $$Probation goals, performance standards, and conduct expectations must be reviewed with the employee in the first week and documented. Managers are accountable for follow-up, not only HR.$$ , 3, null::uuid, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000001'::uuid, 'quiz', 'New hire onboarding assessment', $$Pass the quiz to confirm operational readiness for onboarding and policy handling.$$ , 4, null::uuid, '63000000-0000-4000-8000-000000000001'::uuid, 180, 20),
    ('61000000-0000-4000-8000-000000000002'::uuid, 'text', 'Room turnover standards', $$Housekeeping turnover must protect safety, cleanliness, room readiness, and lost-property control. A room is not released simply because cleaning has started.$$ , 0, null::uuid, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000002'::uuid, 'sop_reference', 'Room cleaning and bed-making SOP', $$Use the linked SOP to align cleaning sequence, linen handling, quality checks, and room release standards.$$ , 1, 'a1000002-0000-0000-0000-000000000008'::uuid, null::uuid, 360, 10),
    ('61000000-0000-4000-8000-000000000002'::uuid, 'text', 'Lost and found discipline', $$Any item left in a room must be bagged, labeled, logged, and transferred per lost and found procedure. Items are never kept in a trolley, pocket, or pantry for later.$$ , 2, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000002'::uuid, 'text', 'Defects and room release', $$If equipment, plumbing, AC, or safety defects are discovered during turnover, the attendant reports them immediately and the room status is held until the defect is assessed and the room is genuinely ready.$$ , 3, null::uuid, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000002'::uuid, 'quiz', 'Room turnover assessment', $$Pass the assessment to confirm room turnover, room release, and defect escalation standards.$$ , 4, null::uuid, '63000000-0000-4000-8000-000000000002'::uuid, 180, 20)
) as seed (
  training_module_id,
  block_type,
  title,
  content,
  block_order,
  source_document_id,
  quiz_id,
  duration_seconds,
  points
);

create temporary table tmp_seed_questions (
  id uuid,
  module_id uuid,
  question_text text,
  question_type text,
  difficulty_level text,
  correct_answer text,
  explanation text,
  linked_sop_id uuid,
  points integer,
  display_order integer
) on commit drop;

insert into tmp_seed_questions (
  id,
  module_id,
  question_text,
  question_type,
  difficulty_level,
  correct_answer,
  explanation,
  linked_sop_id,
  points,
  display_order
)
values
  ('71000000-0000-4000-8000-000000000101'::uuid, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'Before issuing a room key, what must be verified first?', 'mcq', 'medium', 'Guest identity, reservation details, and room readiness', 'Key issuance only happens after identity, reservation, and room status are confirmed.', 'a1000001-0000-0000-0000-000000000001'::uuid, 5, 1),
  ('71000000-0000-4000-8000-000000000102'::uuid, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'A guest arrives early and the room is not yet ready. What is the best operational response?', 'mcq', 'medium', 'Explain the situation, offer luggage assistance, and provide the best available ready-time update', 'Front Office must set expectations, protect the guest experience, and coordinate rather than improvise.', 'a1000001-0000-0000-0000-000000000001'::uuid, 5, 2),
  ('71000000-0000-4000-8000-000000000103'::uuid, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'True or False: A passport or national ID should be matched to the reservation before key cards are issued.', 'true_false', 'easy', 'True', 'Identity verification protects security, payment integrity, and registration accuracy.', 'a1000001-0000-0000-0000-000000000001'::uuid, 5, 3),
  ('71000000-0000-4000-8000-000000000104'::uuid, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'A guest disputes a minibar charge at checkout. What should happen first?', 'mcq', 'medium', 'Review the posting and verify the supporting details before adjusting the folio', 'Disputed charges should be investigated with evidence before any adjustment is made.', 'a1000001-0000-0000-0000-000000000001'::uuid, 5, 4),
  ('71000000-0000-4000-8000-000000000105'::uuid, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'Which action best protects revenue at checkout?', 'mcq', 'medium', 'Confirm the payment method and unsettled balance before closing the folio', 'A clean folio close depends on payment confirmation and review of unsettled amounts.', 'a1000001-0000-0000-0000-000000000001'::uuid, 5, 5),
  ('71000000-0000-4000-8000-000000000106'::uuid, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'True or False: It is acceptable to announce a room number aloud in a crowded lobby if the desk is busy.', 'true_false', 'easy', 'False', 'Room number and folio information must be handled discreetly to protect privacy.', 'a1000001-0000-0000-0000-000000000001'::uuid, 5, 6),
  ('71000000-0000-4000-8000-000000000201'::uuid, '61000000-0000-4000-8000-000000000001'::uuid, 'What should be completed before a new employee receives full system access?', 'mcq', 'medium', 'Identity documents, contract paperwork, and access approval', 'Access must follow verified onboarding documentation and approval.', 'a1000006-0000-0000-0000-000000000001'::uuid, 5, 1),
  ('71000000-0000-4000-8000-000000000202'::uuid, '61000000-0000-4000-8000-000000000001'::uuid, 'Who owns collection of mandatory employment documents?', 'mcq', 'medium', 'HR, with support from the employee and the hiring manager', 'HR controls the process, but the employee and line manager are accountable participants.', 'a1000006-0000-0000-0000-000000000001'::uuid, 5, 2),
  ('71000000-0000-4000-8000-000000000203'::uuid, '61000000-0000-4000-8000-000000000001'::uuid, 'True or False: Probation goals should be reviewed with the employee during the first week.', 'true_false', 'easy', 'True', 'Probation expectations are operational controls and should be documented early.', 'a1000006-0000-0000-0000-000000000001'::uuid, 5, 3),
  ('71000000-0000-4000-8000-000000000204'::uuid, '61000000-0000-4000-8000-000000000001'::uuid, 'If the employee bank details are missing before payroll cutoff, what is the correct action?', 'mcq', 'medium', 'Escalate immediately to HR or payroll and document the gap', 'Payroll-impacting gaps must be escalated before cutoff, not discovered after the run.', 'a1000006-0000-0000-0000-000000000001'::uuid, 5, 4),
  ('71000000-0000-4000-8000-000000000205'::uuid, '61000000-0000-4000-8000-000000000001'::uuid, 'Which records must remain inside authorized HR and management channels?', 'mcq', 'medium', 'Personal identity documents and employee records', 'Sensitive employee data requires controlled access and storage.', 'a1000006-0000-0000-0000-000000000001'::uuid, 5, 5),
  ('71000000-0000-4000-8000-000000000206'::uuid, '61000000-0000-4000-8000-000000000001'::uuid, 'True or False: A new employee can skip orientation if they previously worked in hospitality.', 'true_false', 'easy', 'False', 'Every property and group has its own controls, workflows, and conduct standards.', 'a1000006-0000-0000-0000-000000000001'::uuid, 5, 6),
  ('71000000-0000-4000-8000-000000000301'::uuid, '61000000-0000-4000-8000-000000000002'::uuid, 'When a room turns vacant-dirty, what should happen before deep cleaning begins?', 'mcq', 'medium', 'Secure the room and check for lost items or visible defects', 'Turnover starts with control of the room and early identification of issues.', 'a1000002-0000-0000-0000-000000000008'::uuid, 5, 1),
  ('71000000-0000-4000-8000-000000000302'::uuid, '61000000-0000-4000-8000-000000000002'::uuid, 'Which room status should only be updated after cleaning, amenities, and quality checks are complete?', 'mcq', 'medium', 'Vacant clean', 'Vacant clean means the room is ready for sale, not just partially serviced.', 'a1000002-0000-0000-0000-000000000008'::uuid, 5, 2),
  ('71000000-0000-4000-8000-000000000303'::uuid, '61000000-0000-4000-8000-000000000002'::uuid, 'True or False: The same cloth can be used in the bathroom and bedroom if it is rinsed between uses.', 'true_false', 'easy', 'False', 'Cross-contamination controls require correct tools and separation of use.', 'a1000002-0000-0000-0000-000000000008'::uuid, 5, 3),
  ('71000000-0000-4000-8000-000000000304'::uuid, '61000000-0000-4000-8000-000000000002'::uuid, 'What is the correct handling for property left behind by a guest?', 'mcq', 'medium', 'Bag it, label it, log it, and hand it over through lost and found procedure', 'Lost items must be controlled immediately and auditable from discovery onward.', 'a1000002-0000-0000-0000-000000000008'::uuid, 5, 4),
  ('71000000-0000-4000-8000-000000000305'::uuid, '61000000-0000-4000-8000-000000000002'::uuid, 'An attendant finds an AC leak during turnover. What is the correct action?', 'mcq', 'medium', 'Report maintenance immediately and hold the room until the issue is assessed', 'Unsafe or defective rooms are not released for sale.', 'a1000002-0000-0000-0000-000000000008'::uuid, 5, 5),
  ('71000000-0000-4000-8000-000000000306'::uuid, '61000000-0000-4000-8000-000000000002'::uuid, 'True or False: A room can be marked ready if one amenity is missing as long as the rest of the cleaning is complete.', 'true_false', 'easy', 'False', 'Room readiness includes the full standard, not most of it.', 'a1000002-0000-0000-0000-000000000008'::uuid, 5, 6),
  ('71000000-0000-4000-8000-000000000401'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 'If smoke or fire is confirmed, what is the first operational action?', 'mcq', 'medium', 'Raise the alarm and initiate the emergency response procedure immediately', 'The first step is rapid activation of the emergency process.', 'a1000008-0000-0000-0000-000000000002'::uuid, 5, 1),
  ('71000000-0000-4000-8000-000000000402'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 'True or False: Lifts may be used during a fire evacuation if they are closer than the stairs.', 'true_false', 'easy', 'False', 'Stairwells are used during fire evacuation unless a specialized evacuation plan states otherwise.', 'a1000008-0000-0000-0000-000000000002'::uuid, 5, 2),
  ('71000000-0000-4000-8000-000000000403'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 'Who requires priority support during evacuation?', 'mcq', 'medium', 'Guests with mobility limitations, children, and anyone needing assistance', 'Priority support is based on life safety and vulnerability.', 'a1000008-0000-0000-0000-000000000002'::uuid, 5, 3),
  ('71000000-0000-4000-8000-000000000404'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 'When can staff and guests re-enter the building after an evacuation?', 'mcq', 'medium', 'Only after the designated incident leader gives the all-clear', 'Re-entry is controlled and formal, not improvised.', 'a1000008-0000-0000-0000-000000000002'::uuid, 5, 4),
  ('71000000-0000-4000-8000-000000000405'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 'True or False: Assembly point headcount must be recorded and missing persons reported immediately.', 'true_false', 'easy', 'True', 'Headcount accountability is a core evacuation control.', 'a1000008-0000-0000-0000-000000000002'::uuid, 5, 5),
  ('71000000-0000-4000-8000-000000000406'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 'After an emergency drill or event, what must the supervisor complete?', 'mcq', 'medium', 'An incident or drill report with response gaps and corrective actions', 'Closing the loop is part of emergency readiness.', 'a1000008-0000-0000-0000-000000000002'::uuid, 5, 6),
  ('71000000-0000-4000-8000-000000000501'::uuid, '61000000-0000-4000-8000-000000000004'::uuid, 'You receive an email asking you to urgently confirm your password. What is the best response?', 'mcq', 'medium', 'Do not click, report it as phishing, and follow the security process', 'Credential harvesting attempts must be reported, not tested.', 'a1000010-0000-0000-0000-000000000007'::uuid, 5, 1),
  ('71000000-0000-4000-8000-000000000502'::uuid, '61000000-0000-4000-8000-000000000004'::uuid, 'True or False: Sharing PMS credentials with a coworker is acceptable if the desk is busy.', 'true_false', 'easy', 'False', 'Shared credentials destroy accountability and create serious risk.', 'a1000010-0000-0000-0000-000000000007'::uuid, 5, 2),
  ('71000000-0000-4000-8000-000000000503'::uuid, '61000000-0000-4000-8000-000000000004'::uuid, 'What should happen when you leave a workstation unattended?', 'mcq', 'medium', 'Lock the screen or log out before stepping away', 'Workstation control is a basic cyber hygiene standard.', 'a1000010-0000-0000-0000-000000000007'::uuid, 5, 3),
  ('71000000-0000-4000-8000-000000000504'::uuid, '61000000-0000-4000-8000-000000000004'::uuid, 'What should you do with an unknown USB device found on property?', 'mcq', 'medium', 'Do not connect it; hand it to IT or Security for controlled handling', 'Unknown media must never be inserted into hotel equipment.', 'a1000010-0000-0000-0000-000000000007'::uuid, 5, 4),
  ('71000000-0000-4000-8000-000000000505'::uuid, '61000000-0000-4000-8000-000000000004'::uuid, 'True or False: An unexpected MFA prompt can indicate account compromise and should be denied and reported.', 'true_false', 'easy', 'True', 'Unexpected MFA prompts are a common compromise signal.', 'a1000010-0000-0000-0000-000000000007'::uuid, 5, 5),
  ('71000000-0000-4000-8000-000000000506'::uuid, '61000000-0000-4000-8000-000000000004'::uuid, 'How should guest identity documents be shared internally when required?', 'mcq', 'medium', 'Only through approved secure systems and authorized channels', 'Guest data belongs in controlled systems, not personal apps or open channels.', 'a1000010-0000-0000-0000-000000000007'::uuid, 5, 6),
  ('71000000-0000-4000-8000-000000000601'::uuid, '61000000-0000-4000-8000-000000000005'::uuid, 'When should a cashier count the float?', 'mcq', 'medium', 'At the start and end of the shift during formal handover', 'Opening and closing counts protect accountability for cash on hand.', 'a1000007-0000-0000-0000-000000000008'::uuid, 5, 1),
  ('71000000-0000-4000-8000-000000000602'::uuid, '61000000-0000-4000-8000-000000000005'::uuid, 'What is the correct response to an overage or shortage in the cash drawer?', 'mcq', 'medium', 'Recount, document the variance, and notify the supervisor immediately', 'Discrepancies must be validated and escalated with documentation.', 'a1000007-0000-0000-0000-000000000008'::uuid, 5, 2),
  ('71000000-0000-4000-8000-000000000603'::uuid, '61000000-0000-4000-8000-000000000005'::uuid, 'True or False: A cashier can approve their own refund if the guest is waiting.', 'true_false', 'easy', 'False', 'Refund approval should follow delegated approval rules, not self-approval.', 'a1000007-0000-0000-0000-000000000008'::uuid, 5, 3),
  ('71000000-0000-4000-8000-000000000604'::uuid, '61000000-0000-4000-8000-000000000005'::uuid, 'Before cash is dropped to the safe, which records must be matched?', 'mcq', 'medium', 'Physical cash, system totals, and supporting vouchers or approvals', 'Cash drops must reconcile to documented business activity.', 'a1000007-0000-0000-0000-000000000008'::uuid, 5, 4),
  ('71000000-0000-4000-8000-000000000605'::uuid, '61000000-0000-4000-8000-000000000005'::uuid, 'During night audit, what should happen to an unresolved discrepancy?', 'mcq', 'medium', 'Escalate and document it before final close', 'Unresolved variances are tracked and escalated, not hidden.', 'a1000007-0000-0000-0000-000000000008'::uuid, 5, 5),
  ('71000000-0000-4000-8000-000000000606'::uuid, '61000000-0000-4000-8000-000000000005'::uuid, 'True or False: Separation of cash handling and review reduces fraud risk.', 'true_false', 'easy', 'True', 'Segregation of duties is a core financial control.', 'a1000007-0000-0000-0000-000000000008'::uuid, 5, 6),
  ('71000000-0000-4000-8000-000000000701'::uuid, '61000000-0000-4000-8000-000000000006'::uuid, 'What must happen before maintenance starts on energized equipment?', 'mcq', 'medium', 'Isolate the equipment and apply lockout or tagout where required', 'Safe isolation comes before repair work.', 'a1000005-0000-0000-0000-000000000002'::uuid, 5, 1),
  ('71000000-0000-4000-8000-000000000702'::uuid, '61000000-0000-4000-8000-000000000006'::uuid, 'After a guestroom repair is completed, what must be updated?', 'mcq', 'medium', 'The work order notes, parts used, and room release status', 'A repair is only complete when the record and release are complete.', 'a1000005-0000-0000-0000-000000000002'::uuid, 5, 2),
  ('71000000-0000-4000-8000-000000000703'::uuid, '61000000-0000-4000-8000-000000000006'::uuid, 'True or False: Engineering may enter an occupied room for non-urgent work without coordinating with Front Office or the guest.', 'true_false', 'easy', 'False', 'Occupied room access must be coordinated and controlled.', 'a1000005-0000-0000-0000-000000000002'::uuid, 5, 3),
  ('71000000-0000-4000-8000-000000000704'::uuid, '61000000-0000-4000-8000-000000000006'::uuid, 'Repeated AC or chiller faults should trigger which action?', 'mcq', 'medium', 'A root-cause review and preventive action plan', 'Recurring faults signal a reliability issue, not a one-off repair.', 'a1000005-0000-0000-0000-000000000002'::uuid, 5, 4),
  ('71000000-0000-4000-8000-000000000705'::uuid, '61000000-0000-4000-8000-000000000006'::uuid, 'Which reading is critical on preventive maintenance logs for refrigeration equipment?', 'mcq', 'medium', 'The recorded operating temperature against standard range', 'Temperature control is a core operational reading.', 'a1000005-0000-0000-0000-000000000002'::uuid, 5, 5),
  ('71000000-0000-4000-8000-000000000706'::uuid, '61000000-0000-4000-8000-000000000006'::uuid, 'True or False: Fire-life-safety defects must be escalated immediately even if a workaround exists.', 'true_false', 'easy', 'True', 'Life-safety defects are escalated immediately and formally.', 'a1000005-0000-0000-0000-000000000002'::uuid, 5, 6),
  ('71000000-0000-4000-8000-000000000801'::uuid, '61000000-0000-4000-8000-000000000007'::uuid, 'What is the first priority when responding to an altercation?', 'mcq', 'medium', 'Protect safety, call for support, and separate the parties if possible', 'Security response starts with life safety and scene control.', 'a1000008-0000-0000-0000-000000000008'::uuid, 5, 1),
  ('71000000-0000-4000-8000-000000000802'::uuid, '61000000-0000-4000-8000-000000000007'::uuid, 'True or False: CCTV footage can be shared with any supervisor who asks for it.', 'true_false', 'easy', 'False', 'CCTV access is restricted and controlled.', 'a1000008-0000-0000-0000-000000000008'::uuid, 5, 2),
  ('71000000-0000-4000-8000-000000000803'::uuid, '61000000-0000-4000-8000-000000000007'::uuid, 'What is the correct response to a lost master key?', 'mcq', 'medium', 'Escalate immediately and initiate the property key-control response', 'Master key incidents require immediate escalation and control response.', 'a1000008-0000-0000-0000-000000000008'::uuid, 5, 3),
  ('71000000-0000-4000-8000-000000000804'::uuid, '61000000-0000-4000-8000-000000000007'::uuid, 'How should evidence at an incident scene be handled?', 'mcq', 'medium', 'Preserve it, document it, and minimize disturbance', 'Evidence integrity supports a defensible investigation.', 'a1000008-0000-0000-0000-000000000008'::uuid, 5, 4),
  ('71000000-0000-4000-8000-000000000805'::uuid, '61000000-0000-4000-8000-000000000007'::uuid, 'Which information belongs in an incident report?', 'mcq', 'medium', 'Facts, times, location, people involved, and actions taken', 'Good reports document facts and actions, not assumptions.', 'a1000008-0000-0000-0000-000000000008'::uuid, 5, 5),
  ('71000000-0000-4000-8000-000000000806'::uuid, '61000000-0000-4000-8000-000000000007'::uuid, 'True or False: Investigation details should be shared only on a need-to-know basis.', 'true_false', 'easy', 'True', 'Incident handling must protect privacy and preserve investigative integrity.', 'a1000008-0000-0000-0000-000000000008'::uuid, 5, 6);

insert into public.knowledge_questions (
  id,
  question_text,
  question_type,
  difficulty_level,
  correct_answer,
  explanation,
  linked_sop_id,
  estimated_time_seconds,
  points,
  status,
  version,
  created_by,
  training_module_id
)
select
  q.id,
  q.question_text,
  q.question_type,
  q.difficulty_level,
  q.correct_answer,
  q.explanation,
  q.linked_sop_id,
  45,
  q.points,
  'published',
  1,
  ctx.created_by,
  q.module_id
from tmp_seed_questions q
cross join tmp_seed_context ctx
on conflict (id) do update
set
  question_text = excluded.question_text,
  question_type = excluded.question_type,
  difficulty_level = excluded.difficulty_level,
  correct_answer = excluded.correct_answer,
  explanation = excluded.explanation,
  linked_sop_id = excluded.linked_sop_id,
  estimated_time_seconds = excluded.estimated_time_seconds,
  points = excluded.points,
  status = excluded.status,
  version = excluded.version,
  created_by = excluded.created_by,
  training_module_id = excluded.training_module_id,
  updated_at = timezone('utc', now());

create temporary table tmp_seed_options (
  question_id uuid,
  option_text text,
  is_correct boolean,
  display_order integer,
  feedback text
) on commit drop;

insert into tmp_seed_options (question_id, option_text, is_correct, display_order, feedback)
values
  ('71000000-0000-4000-8000-000000000101'::uuid, 'Guest identity, reservation details, and room readiness', true, 0, 'Correct. Verification must happen before key issuance.'),
  ('71000000-0000-4000-8000-000000000101'::uuid, 'The guest''s breakfast preference only', false, 1, 'Breakfast preference matters, but it is not the gate for key issuance.'),
  ('71000000-0000-4000-8000-000000000101'::uuid, 'Whether the porter is available', false, 2, 'Porter availability does not control room release.'),
  ('71000000-0000-4000-8000-000000000102'::uuid, 'Tell the guest to return later without recording the case', false, 0, 'That creates poor service and weak coordination.'),
  ('71000000-0000-4000-8000-000000000102'::uuid, 'Explain the situation, offer luggage assistance, and provide the best available ready-time update', true, 1, 'Correct. Set expectations and coordinate properly.'),
  ('71000000-0000-4000-8000-000000000102'::uuid, 'Assign any dirty room and ask housekeeping to rush while the guest waits inside', false, 2, 'Rooms are not assigned before readiness and control.'),
  ('71000000-0000-4000-8000-000000000103'::uuid, 'True', true, 0, 'Correct. Match identity to the reservation before key issue.'),
  ('71000000-0000-4000-8000-000000000103'::uuid, 'False', false, 1, 'False would breach identity control.'),
  ('71000000-0000-4000-8000-000000000104'::uuid, 'Remove the charge immediately to avoid discussion', false, 0, 'Adjustments require review, not instant removal.'),
  ('71000000-0000-4000-8000-000000000104'::uuid, 'Review the posting and verify the supporting details before adjusting the folio', true, 1, 'Correct. Check the evidence first.'),
  ('71000000-0000-4000-8000-000000000104'::uuid, 'Close the folio first and review it later', false, 2, 'Once closed, resolution becomes harder and less controlled.'),
  ('71000000-0000-4000-8000-000000000105'::uuid, 'Confirm the payment method and unsettled balance before closing the folio', true, 0, 'Correct. Revenue protection happens before final close.'),
  ('71000000-0000-4000-8000-000000000105'::uuid, 'Print the invoice before checking the payment method', false, 1, 'Printing alone does not confirm settlement.'),
  ('71000000-0000-4000-8000-000000000105'::uuid, 'Skip the review if the guest appears in a hurry', false, 2, 'Speed does not override control.'),
  ('71000000-0000-4000-8000-000000000106'::uuid, 'True', false, 0, 'Never announce room numbers loudly in public.'),
  ('71000000-0000-4000-8000-000000000106'::uuid, 'False', true, 1, 'Correct. Room details must be handled discreetly.'),
  ('71000000-0000-4000-8000-000000000201'::uuid, 'A full rota allocation only', false, 0, 'Rota planning alone is not enough for system access.'),
  ('71000000-0000-4000-8000-000000000201'::uuid, 'Identity documents, contract paperwork, and access approval', true, 1, 'Correct. Access follows verified onboarding controls.'),
  ('71000000-0000-4000-8000-000000000201'::uuid, 'Uniform sizing only', false, 2, 'Uniform sizing is useful but not the access gate.'),
  ('71000000-0000-4000-8000-000000000202'::uuid, 'Only the department head', false, 0, 'Managers support the process but do not own it alone.'),
  ('71000000-0000-4000-8000-000000000202'::uuid, 'HR, with support from the employee and the hiring manager', true, 1, 'Correct. HR owns the collection flow.'),
  ('71000000-0000-4000-8000-000000000202'::uuid, 'Any supervisor available on shift', false, 2, 'Ownership should be clear and auditable.'),
  ('71000000-0000-4000-8000-000000000203'::uuid, 'True', true, 0, 'Correct. First-week clarity is part of good onboarding.'),
  ('71000000-0000-4000-8000-000000000203'::uuid, 'False', false, 1, 'Delaying probation discussion weakens control.'),
  ('71000000-0000-4000-8000-000000000204'::uuid, 'Wait for the employee to remember later', false, 0, 'Payroll gaps should not wait passively.'),
  ('71000000-0000-4000-8000-000000000204'::uuid, 'Escalate immediately to HR or payroll and document the gap', true, 1, 'Correct. Missing payroll data is an immediate escalation item.'),
  ('71000000-0000-4000-8000-000000000204'::uuid, 'Enter a colleague''s bank details temporarily', false, 2, 'That would be a severe control failure.'),
  ('71000000-0000-4000-8000-000000000205'::uuid, 'Personal identity documents and employee records', true, 0, 'Correct. Sensitive employee records stay in authorized channels.'),
  ('71000000-0000-4000-8000-000000000205'::uuid, 'The daily restaurant briefing', false, 1, 'This is not an HR-sensitive record set.'),
  ('71000000-0000-4000-8000-000000000205'::uuid, 'Lobby music schedules', false, 2, 'Not relevant to confidential HR records.'),
  ('71000000-0000-4000-8000-000000000206'::uuid, 'True', false, 0, 'Previous industry experience does not remove local onboarding.'),
  ('71000000-0000-4000-8000-000000000206'::uuid, 'False', true, 1, 'Correct. Every employee completes orientation here.'),
  ('71000000-0000-4000-8000-000000000301'::uuid, 'Secure the room and check for lost items or visible defects', true, 0, 'Correct. Control and inspection come before the deep clean.'),
  ('71000000-0000-4000-8000-000000000301'::uuid, 'Immediately strip the bed without inspecting the room', false, 1, 'Important control points would be missed.'),
  ('71000000-0000-4000-8000-000000000301'::uuid, 'Leave the room open while gathering supplies', false, 2, 'The room should remain controlled.'),
  ('71000000-0000-4000-8000-000000000302'::uuid, 'Out of order', false, 0, 'That status is for defect conditions, not ready rooms.'),
  ('71000000-0000-4000-8000-000000000302'::uuid, 'Vacant clean', true, 1, 'Correct. That status signals room readiness.'),
  ('71000000-0000-4000-8000-000000000302'::uuid, 'Occupied clean', false, 2, 'Occupied status is not for post-departure turnover.'),
  ('71000000-0000-4000-8000-000000000303'::uuid, 'True', false, 0, 'Rinsing does not remove cross-contamination risk.'),
  ('71000000-0000-4000-8000-000000000303'::uuid, 'False', true, 1, 'Correct. Use the correct color or area-specific tool.'),
  ('71000000-0000-4000-8000-000000000304'::uuid, 'Put it in a trolley drawer until the end of shift', false, 0, 'Lost items need immediate controlled handling.'),
  ('71000000-0000-4000-8000-000000000304'::uuid, 'Bag it, label it, log it, and hand it over through lost and found procedure', true, 1, 'Correct. That creates a clean audit trail.'),
  ('71000000-0000-4000-8000-000000000304'::uuid, 'Take a photo and leave the item where it is', false, 2, 'The item must be secured.'),
  ('71000000-0000-4000-8000-000000000305'::uuid, 'Ignore it if the room still looks presentable', false, 0, 'Leaks can create safety and guest comfort problems.'),
  ('71000000-0000-4000-8000-000000000305'::uuid, 'Report maintenance immediately and hold the room until the issue is assessed', true, 1, 'Correct. The room is not ready while a leak risk exists.'),
  ('71000000-0000-4000-8000-000000000305'::uuid, 'Cover it with towels and mark the room clean', false, 2, 'That hides the defect and creates risk.'),
  ('71000000-0000-4000-8000-000000000306'::uuid, 'True', false, 0, 'A missing amenity means the room is not fully ready.'),
  ('71000000-0000-4000-8000-000000000306'::uuid, 'False', true, 1, 'Correct. Ready means the standard is complete.'),
  ('71000000-0000-4000-8000-000000000401'::uuid, 'Raise the alarm and initiate the emergency response procedure immediately', true, 0, 'Correct. Speed matters in a confirmed event.'),
  ('71000000-0000-4000-8000-000000000401'::uuid, 'Finish the current guest interaction first', false, 1, 'Immediate escalation takes priority.'),
  ('71000000-0000-4000-8000-000000000401'::uuid, 'Wait for a second employee to confirm it', false, 2, 'Do not delay confirmed emergency action.'),
  ('71000000-0000-4000-8000-000000000402'::uuid, 'True', false, 0, 'Lifts are not used during fire evacuation.'),
  ('71000000-0000-4000-8000-000000000402'::uuid, 'False', true, 1, 'Correct. Use stairs and evacuation routes.'),
  ('71000000-0000-4000-8000-000000000403'::uuid, 'Guests with mobility limitations, children, and anyone needing assistance', true, 0, 'Correct. Evacuation support prioritizes vulnerable persons.'),
  ('71000000-0000-4000-8000-000000000403'::uuid, 'Only VIP guests', false, 1, 'Priority is based on life safety, not status.'),
  ('71000000-0000-4000-8000-000000000403'::uuid, 'Only staff members', false, 2, 'Both staff and guests are considered.'),
  ('71000000-0000-4000-8000-000000000404'::uuid, 'As soon as the smoke looks gone', false, 0, 'Visual judgment alone is not enough.'),
  ('71000000-0000-4000-8000-000000000404'::uuid, 'Only after the designated incident leader gives the all-clear', true, 1, 'Correct. Re-entry is controlled.'),
  ('71000000-0000-4000-8000-000000000404'::uuid, 'Whenever a guest insists', false, 2, 'Guest insistence does not override the all-clear process.'),
  ('71000000-0000-4000-8000-000000000405'::uuid, 'True', true, 0, 'Correct. Assembly accountability is mandatory.'),
  ('71000000-0000-4000-8000-000000000405'::uuid, 'False', false, 1, 'Skipping headcount weakens life-safety control.'),
  ('71000000-0000-4000-8000-000000000406'::uuid, 'An incident or drill report with response gaps and corrective actions', true, 0, 'Correct. Post-event review is part of readiness.'),
  ('71000000-0000-4000-8000-000000000406'::uuid, 'Only a verbal handover', false, 1, 'Written reporting is required.'),
  ('71000000-0000-4000-8000-000000000406'::uuid, 'A staff meal deduction form', false, 2, 'Not related to emergency response closure.'),
  ('71000000-0000-4000-8000-000000000501'::uuid, 'Do not click, report it as phishing, and follow the security process', true, 0, 'Correct. Treat it as a phishing attempt.'),
  ('71000000-0000-4000-8000-000000000501'::uuid, 'Reply with your username only', false, 1, 'Do not engage with suspicious requests.'),
  ('71000000-0000-4000-8000-000000000501'::uuid, 'Click the link to see if it looks real', false, 2, 'Testing suspicious links creates risk.'),
  ('71000000-0000-4000-8000-000000000502'::uuid, 'True', false, 0, 'Busy operations do not justify credential sharing.'),
  ('71000000-0000-4000-8000-000000000502'::uuid, 'False', true, 1, 'Correct. Credentials are individual and controlled.'),
  ('71000000-0000-4000-8000-000000000503'::uuid, 'Lock the screen or log out before stepping away', true, 0, 'Correct. Always protect unattended workstations.'),
  ('71000000-0000-4000-8000-000000000503'::uuid, 'Leave the session open if you will return quickly', false, 1, 'Short absences still create risk.'),
  ('71000000-0000-4000-8000-000000000503'::uuid, 'Switch the monitor off only', false, 2, 'Turning off the monitor is not the same as locking access.'),
  ('71000000-0000-4000-8000-000000000504'::uuid, 'Do not connect it; hand it to IT or Security for controlled handling', true, 0, 'Correct. Unknown devices are controlled evidence, not tools.'),
  ('71000000-0000-4000-8000-000000000504'::uuid, 'Use it on a spare computer to see what is inside', false, 1, 'Never test unknown media casually.'),
  ('71000000-0000-4000-8000-000000000504'::uuid, 'Take it home and scan it later', false, 2, 'That breaks chain of custody and control.'),
  ('71000000-0000-4000-8000-000000000505'::uuid, 'True', true, 0, 'Correct. Unexpected MFA prompts may signal compromise.'),
  ('71000000-0000-4000-8000-000000000505'::uuid, 'False', false, 1, 'Ignoring an unexpected MFA event is unsafe.'),
  ('71000000-0000-4000-8000-000000000506'::uuid, 'Only through approved secure systems and authorized channels', true, 0, 'Correct. Guest documents stay in secure systems.'),
  ('71000000-0000-4000-8000-000000000506'::uuid, 'Through any personal messaging app if the file is clear', false, 1, 'Personal apps are not approved secure channels.'),
  ('71000000-0000-4000-8000-000000000506'::uuid, 'On a shared public folder without restrictions', false, 2, 'Open folders are not appropriate for guest identity data.'),
  ('71000000-0000-4000-8000-000000000601'::uuid, 'At the start and end of the shift during formal handover', true, 0, 'Correct. Formal counts anchor accountability.'),
  ('71000000-0000-4000-8000-000000000601'::uuid, 'Only if the cash drawer feels heavy', false, 1, 'Cash control is scheduled, not instinctive.'),
  ('71000000-0000-4000-8000-000000000601'::uuid, 'Once a week', false, 2, 'Shift-based cash handling requires far tighter control.'),
  ('71000000-0000-4000-8000-000000000602'::uuid, 'Recount, document the variance, and notify the supervisor immediately', true, 0, 'Correct. Validate then escalate the variance.'),
  ('71000000-0000-4000-8000-000000000602'::uuid, 'Cover the shortage from personal cash and continue', false, 1, 'Personal balancing destroys control and evidence.'),
  ('71000000-0000-4000-8000-000000000602'::uuid, 'Leave the variance for the next cashier to discover', false, 2, 'Delaying action weakens accountability.'),
  ('71000000-0000-4000-8000-000000000603'::uuid, 'True', false, 0, 'Self-approval breaches financial control.'),
  ('71000000-0000-4000-8000-000000000603'::uuid, 'False', true, 1, 'Correct. Refund approvals follow delegated control.'),
  ('71000000-0000-4000-8000-000000000604'::uuid, 'Physical cash, system totals, and supporting vouchers or approvals', true, 0, 'Correct. The drop must reconcile to records and approvals.'),
  ('71000000-0000-4000-8000-000000000604'::uuid, 'Only the cashier''s memory of transactions', false, 1, 'Memory is not a control record.'),
  ('71000000-0000-4000-8000-000000000604'::uuid, 'Only the safe drop envelope number', false, 2, 'Envelope numbering helps, but it is not the full match.'),
  ('71000000-0000-4000-8000-000000000605'::uuid, 'Escalate and document it before final close', true, 0, 'Correct. Do not bury discrepancies during close.'),
  ('71000000-0000-4000-8000-000000000605'::uuid, 'Ignore it if the amount is small', false, 1, 'Materiality does not remove the need to document.'),
  ('71000000-0000-4000-8000-000000000605'::uuid, 'Ask the morning shift to decide later', false, 2, 'The night audit must hand over the documented issue cleanly.'),
  ('71000000-0000-4000-8000-000000000606'::uuid, 'True', true, 0, 'Correct. Segregation of duties reduces fraud and error risk.'),
  ('71000000-0000-4000-8000-000000000606'::uuid, 'False', false, 1, 'One-person control over everything increases risk.'),
  ('71000000-0000-4000-8000-000000000701'::uuid, 'Isolate the equipment and apply lockout or tagout where required', true, 0, 'Correct. Safe isolation comes first.'),
  ('71000000-0000-4000-8000-000000000701'::uuid, 'Start troubleshooting and isolate power later if needed', false, 1, 'Safety steps are not optional.'),
  ('71000000-0000-4000-8000-000000000701'::uuid, 'Only wear gloves and begin work', false, 2, 'PPE does not replace isolation.'),
  ('71000000-0000-4000-8000-000000000702'::uuid, 'The work order notes, parts used, and room release status', true, 0, 'Correct. Closure requires complete documentation and release.'),
  ('71000000-0000-4000-8000-000000000702'::uuid, 'Only the technician''s initials', false, 1, 'Initials alone do not document the repair.'),
  ('71000000-0000-4000-8000-000000000702'::uuid, 'Nothing if the guest is already satisfied', false, 2, 'Guest satisfaction does not replace records.'),
  ('71000000-0000-4000-8000-000000000703'::uuid, 'True', false, 0, 'Occupied room access must be coordinated.'),
  ('71000000-0000-4000-8000-000000000703'::uuid, 'False', true, 1, 'Correct. Coordinate with Front Office and the guest.'),
  ('71000000-0000-4000-8000-000000000704'::uuid, 'A root-cause review and preventive action plan', true, 0, 'Correct. Repeating faults need deeper corrective action.'),
  ('71000000-0000-4000-8000-000000000704'::uuid, 'Only a new coat of paint', false, 1, 'Cosmetic work does not fix plant reliability issues.'),
  ('71000000-0000-4000-8000-000000000704'::uuid, 'No action if the guest has checked out', false, 2, 'The asset still needs a proper fix.'),
  ('71000000-0000-4000-8000-000000000705'::uuid, 'The recorded operating temperature against standard range', true, 0, 'Correct. Temperature is a core control reading.'),
  ('71000000-0000-4000-8000-000000000705'::uuid, 'Only the color of the condenser casing', false, 1, 'Visual casing color is not an operating control.'),
  ('71000000-0000-4000-8000-000000000705'::uuid, 'Only the shift roster', false, 2, 'Staffing is not the equipment reading required here.'),
  ('71000000-0000-4000-8000-000000000706'::uuid, 'True', true, 0, 'Correct. Fire-life-safety defects are escalated immediately.'),
  ('71000000-0000-4000-8000-000000000706'::uuid, 'False', false, 1, 'Workarounds do not remove escalation requirements.'),
  ('71000000-0000-4000-8000-000000000801'::uuid, 'Protect safety, call for support, and separate the parties if possible', true, 0, 'Correct. Life safety and control come first.'),
  ('71000000-0000-4000-8000-000000000801'::uuid, 'Start interviewing witnesses before controlling the scene', false, 1, 'Witness work comes after the scene is safe.'),
  ('71000000-0000-4000-8000-000000000801'::uuid, 'Leave the scene until a manager arrives', false, 2, 'Security must control the scene immediately.'),
  ('71000000-0000-4000-8000-000000000802'::uuid, 'True', false, 0, 'CCTV footage is controlled information.'),
  ('71000000-0000-4000-8000-000000000802'::uuid, 'False', true, 1, 'Correct. Footage sharing follows strict authorization.'),
  ('71000000-0000-4000-8000-000000000803'::uuid, 'Escalate immediately and initiate the property key-control response', true, 0, 'Correct. Master key loss is a high-risk event.'),
  ('71000000-0000-4000-8000-000000000803'::uuid, 'Wait until end of shift to avoid disruption', false, 1, 'Delay increases security exposure.'),
  ('71000000-0000-4000-8000-000000000803'::uuid, 'Ask housekeeping to look for it without escalation', false, 2, 'Search may happen, but escalation is immediate.'),
  ('71000000-0000-4000-8000-000000000804'::uuid, 'Preserve it, document it, and minimize disturbance', true, 0, 'Correct. Evidence integrity matters.'),
  ('71000000-0000-4000-8000-000000000804'::uuid, 'Move everything to a safer place before taking notes', false, 1, 'Unnecessary movement can damage evidence value.'),
  ('71000000-0000-4000-8000-000000000804'::uuid, 'Throw away low-value items', false, 2, 'Do not destroy possible evidence.'),
  ('71000000-0000-4000-8000-000000000805'::uuid, 'Facts, times, location, people involved, and actions taken', true, 0, 'Correct. Incident reports record facts and actions.'),
  ('71000000-0000-4000-8000-000000000805'::uuid, 'Only the security officer''s opinion', false, 1, 'Opinion is not the core of the record.'),
  ('71000000-0000-4000-8000-000000000805'::uuid, 'Only the final outcome', false, 2, 'The chronology and facts matter too.'),
  ('71000000-0000-4000-8000-000000000806'::uuid, 'True', true, 0, 'Correct. Investigative details stay on a need-to-know basis.'),
  ('71000000-0000-4000-8000-000000000806'::uuid, 'False', false, 1, 'Open sharing weakens privacy and case control.');

delete from public.knowledge_question_options
where question_id in (select id from tmp_seed_questions);

insert into public.knowledge_question_options (
  id,
  question_id,
  option_text,
  is_correct,
  display_order,
  feedback
)
select
  gen_random_uuid(),
  question_id,
  option_text,
  is_correct,
  display_order,
  feedback
from tmp_seed_options;

delete from public.learning_quiz_questions
where quiz_id in (
  'd69624ad-b02f-4030-b653-f018d6271e8b'::uuid,
  '508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid,
  '63000000-0000-4000-8000-000000000001'::uuid,
  '63000000-0000-4000-8000-000000000002'::uuid,
  '63000000-0000-4000-8000-000000000003'::uuid,
  '63000000-0000-4000-8000-000000000004'::uuid,
  '63000000-0000-4000-8000-000000000005'::uuid,
  '63000000-0000-4000-8000-000000000006'::uuid,
  '63000000-0000-4000-8000-000000000007'::uuid
);

insert into public.learning_quiz_questions (
  id,
  quiz_id,
  question_id,
  display_order,
  points_override
)
select
  gen_random_uuid(),
  seed.quiz_id,
  seed.question_id,
  seed.display_order,
  seed.points_override
from (
  values
    ('d69624ad-b02f-4030-b653-f018d6271e8b'::uuid, '2ca8333c-3e8c-42be-8bcc-200df132a795'::uuid, 1, 3),
    ('d69624ad-b02f-4030-b653-f018d6271e8b'::uuid, 'cbc5c856-03e6-4c04-adcd-150b211664ce'::uuid, 2, 3),
    ('d69624ad-b02f-4030-b653-f018d6271e8b'::uuid, '3aebba3e-7a89-43e0-baab-eefb0a84ba63'::uuid, 3, 3),
    ('d69624ad-b02f-4030-b653-f018d6271e8b'::uuid, '69a2b7d3-3c67-49f1-b726-6a2e71adc24b'::uuid, 4, 3),
    ('d69624ad-b02f-4030-b653-f018d6271e8b'::uuid, 'e5a88b00-b611-46fc-84e1-35e4161b676b'::uuid, 5, 3),
    ('d69624ad-b02f-4030-b653-f018d6271e8b'::uuid, 'bf87809c-e7d9-48a0-9ec2-b593f46a1b5e'::uuid, 6, 3),
    ('d69624ad-b02f-4030-b653-f018d6271e8b'::uuid, '3f4739ff-95ab-4798-888d-24a5cfe8e2fa'::uuid, 7, 3),
    ('d69624ad-b02f-4030-b653-f018d6271e8b'::uuid, '60f58ca9-3685-459a-aacd-2d921e972368'::uuid, 8, 3),
    ('508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid, '71000000-0000-4000-8000-000000000101'::uuid, 1, 5),
    ('508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid, '71000000-0000-4000-8000-000000000102'::uuid, 2, 5),
    ('508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid, '71000000-0000-4000-8000-000000000103'::uuid, 3, 5),
    ('508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid, '71000000-0000-4000-8000-000000000104'::uuid, 4, 5),
    ('508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid, '71000000-0000-4000-8000-000000000105'::uuid, 5, 5),
    ('508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid, '71000000-0000-4000-8000-000000000106'::uuid, 6, 5),
    ('63000000-0000-4000-8000-000000000001'::uuid, '71000000-0000-4000-8000-000000000201'::uuid, 1, 5),
    ('63000000-0000-4000-8000-000000000001'::uuid, '71000000-0000-4000-8000-000000000202'::uuid, 2, 5),
    ('63000000-0000-4000-8000-000000000001'::uuid, '71000000-0000-4000-8000-000000000203'::uuid, 3, 5),
    ('63000000-0000-4000-8000-000000000001'::uuid, '71000000-0000-4000-8000-000000000204'::uuid, 4, 5),
    ('63000000-0000-4000-8000-000000000001'::uuid, '71000000-0000-4000-8000-000000000205'::uuid, 5, 5),
    ('63000000-0000-4000-8000-000000000001'::uuid, '71000000-0000-4000-8000-000000000206'::uuid, 6, 5),
    ('63000000-0000-4000-8000-000000000002'::uuid, '71000000-0000-4000-8000-000000000301'::uuid, 1, 5),
    ('63000000-0000-4000-8000-000000000002'::uuid, '71000000-0000-4000-8000-000000000302'::uuid, 2, 5),
    ('63000000-0000-4000-8000-000000000002'::uuid, '71000000-0000-4000-8000-000000000303'::uuid, 3, 5),
    ('63000000-0000-4000-8000-000000000002'::uuid, '71000000-0000-4000-8000-000000000304'::uuid, 4, 5),
    ('63000000-0000-4000-8000-000000000002'::uuid, '71000000-0000-4000-8000-000000000305'::uuid, 5, 5),
    ('63000000-0000-4000-8000-000000000002'::uuid, '71000000-0000-4000-8000-000000000306'::uuid, 6, 5),
    ('63000000-0000-4000-8000-000000000003'::uuid, '71000000-0000-4000-8000-000000000401'::uuid, 1, 5),
    ('63000000-0000-4000-8000-000000000003'::uuid, '71000000-0000-4000-8000-000000000402'::uuid, 2, 5),
    ('63000000-0000-4000-8000-000000000003'::uuid, '71000000-0000-4000-8000-000000000403'::uuid, 3, 5),
    ('63000000-0000-4000-8000-000000000003'::uuid, '71000000-0000-4000-8000-000000000404'::uuid, 4, 5),
    ('63000000-0000-4000-8000-000000000003'::uuid, '71000000-0000-4000-8000-000000000405'::uuid, 5, 5),
    ('63000000-0000-4000-8000-000000000003'::uuid, '71000000-0000-4000-8000-000000000406'::uuid, 6, 5),
    ('63000000-0000-4000-8000-000000000004'::uuid, '71000000-0000-4000-8000-000000000501'::uuid, 1, 5),
    ('63000000-0000-4000-8000-000000000004'::uuid, '71000000-0000-4000-8000-000000000502'::uuid, 2, 5),
    ('63000000-0000-4000-8000-000000000004'::uuid, '71000000-0000-4000-8000-000000000503'::uuid, 3, 5),
    ('63000000-0000-4000-8000-000000000004'::uuid, '71000000-0000-4000-8000-000000000504'::uuid, 4, 5),
    ('63000000-0000-4000-8000-000000000004'::uuid, '71000000-0000-4000-8000-000000000505'::uuid, 5, 5),
    ('63000000-0000-4000-8000-000000000004'::uuid, '71000000-0000-4000-8000-000000000506'::uuid, 6, 5),
    ('63000000-0000-4000-8000-000000000005'::uuid, '71000000-0000-4000-8000-000000000601'::uuid, 1, 5),
    ('63000000-0000-4000-8000-000000000005'::uuid, '71000000-0000-4000-8000-000000000602'::uuid, 2, 5),
    ('63000000-0000-4000-8000-000000000005'::uuid, '71000000-0000-4000-8000-000000000603'::uuid, 3, 5),
    ('63000000-0000-4000-8000-000000000005'::uuid, '71000000-0000-4000-8000-000000000604'::uuid, 4, 5),
    ('63000000-0000-4000-8000-000000000005'::uuid, '71000000-0000-4000-8000-000000000605'::uuid, 5, 5),
    ('63000000-0000-4000-8000-000000000005'::uuid, '71000000-0000-4000-8000-000000000606'::uuid, 6, 5),
    ('63000000-0000-4000-8000-000000000006'::uuid, '71000000-0000-4000-8000-000000000701'::uuid, 1, 5),
    ('63000000-0000-4000-8000-000000000006'::uuid, '71000000-0000-4000-8000-000000000702'::uuid, 2, 5),
    ('63000000-0000-4000-8000-000000000006'::uuid, '71000000-0000-4000-8000-000000000703'::uuid, 3, 5),
    ('63000000-0000-4000-8000-000000000006'::uuid, '71000000-0000-4000-8000-000000000704'::uuid, 4, 5),
    ('63000000-0000-4000-8000-000000000006'::uuid, '71000000-0000-4000-8000-000000000705'::uuid, 5, 5),
    ('63000000-0000-4000-8000-000000000006'::uuid, '71000000-0000-4000-8000-000000000706'::uuid, 6, 5),
    ('63000000-0000-4000-8000-000000000007'::uuid, '71000000-0000-4000-8000-000000000801'::uuid, 1, 5),
    ('63000000-0000-4000-8000-000000000007'::uuid, '71000000-0000-4000-8000-000000000802'::uuid, 2, 5),
    ('63000000-0000-4000-8000-000000000007'::uuid, '71000000-0000-4000-8000-000000000803'::uuid, 3, 5),
    ('63000000-0000-4000-8000-000000000007'::uuid, '71000000-0000-4000-8000-000000000804'::uuid, 4, 5),
    ('63000000-0000-4000-8000-000000000007'::uuid, '71000000-0000-4000-8000-000000000805'::uuid, 5, 5),
    ('63000000-0000-4000-8000-000000000007'::uuid, '71000000-0000-4000-8000-000000000806'::uuid, 6, 5)
) as seed (quiz_id, question_id, display_order, points_override);

insert into public.skills (id, name, category, description)
values
  ('73000000-0000-4000-8000-000000000001'::uuid, 'HR Onboarding Compliance', 'Human Resources', 'Ability to complete onboarding controls, document collection, and Day 1 compliance steps.'),
  ('73000000-0000-4000-8000-000000000002'::uuid, 'Policy Acknowledgement & Ethics', 'Human Resources', 'Understanding of code of conduct, confidentiality, and signed policy acknowledgement control points.'),
  ('73000000-0000-4000-8000-000000000003'::uuid, 'Cybersecurity Awareness', 'IT', 'Ability to detect phishing, protect credentials, and follow incident reporting basics.'),
  ('73000000-0000-4000-8000-000000000004'::uuid, 'Secure Guest Data Handling', 'IT', 'Ability to handle guest identity and reservation data through approved secure channels only.'),
  ('73000000-0000-4000-8000-000000000005'::uuid, 'Cash Handling Controls', 'Finance', 'Ability to count, reconcile, document, and escalate cash variances correctly.'),
  ('73000000-0000-4000-8000-000000000006'::uuid, 'Night Audit Reconciliation', 'Finance', 'Ability to validate postings, settlement status, and unresolved audit exceptions.'),
  ('73000000-0000-4000-8000-000000000007'::uuid, 'Preventive Maintenance Planning', 'Engineering', 'Ability to execute safe PM work, coordinate access, and close work orders correctly.'),
  ('73000000-0000-4000-8000-000000000008'::uuid, 'Technical Incident Escalation', 'Engineering', 'Ability to escalate recurrent faults and life-safety defects through the correct technical path.'),
  ('73000000-0000-4000-8000-000000000009'::uuid, 'Incident Reporting & Evidence Preservation', 'Security', 'Ability to preserve scenes, control access, and write complete factual incident reports.')
on conflict (id) do update
set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description;

delete from public.module_skills
where module_id in (
  '5d54ecee-7731-4b83-adf3-14b795eaa092'::uuid,
  '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid,
  '61000000-0000-4000-8000-000000000001'::uuid,
  '61000000-0000-4000-8000-000000000002'::uuid,
  '61000000-0000-4000-8000-000000000003'::uuid,
  '61000000-0000-4000-8000-000000000004'::uuid,
  '61000000-0000-4000-8000-000000000005'::uuid,
  '61000000-0000-4000-8000-000000000006'::uuid,
  '61000000-0000-4000-8000-000000000007'::uuid
);

insert into public.module_skills (id, module_id, skill_id, points_awarded)
select
  gen_random_uuid(),
  seed.module_id,
  seed.skill_id,
  seed.points_awarded
from (
  values
    ('5d54ecee-7731-4b83-adf3-14b795eaa092'::uuid, '78eb4552-8026-43ec-88e9-bdcfad1fa542'::uuid, 20),
    ('5d54ecee-7731-4b83-adf3-14b795eaa092'::uuid, '2a83c5bc-15ff-4891-86b7-4c7675ac8352'::uuid, 15),
    ('5d54ecee-7731-4b83-adf3-14b795eaa092'::uuid, '73000000-0000-4000-8000-000000000004'::uuid, 15),
    ('2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, '78eb4552-8026-43ec-88e9-bdcfad1fa542'::uuid, 20),
    ('2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'f0138b4e-ff14-459d-beaf-5d286f84cab0'::uuid, 20),
    ('2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, '4159f317-0db2-4d34-897b-fc5b064d6c4d'::uuid, 10),
    ('61000000-0000-4000-8000-000000000001'::uuid, '73000000-0000-4000-8000-000000000001'::uuid, 20),
    ('61000000-0000-4000-8000-000000000001'::uuid, '73000000-0000-4000-8000-000000000002'::uuid, 15),
    ('61000000-0000-4000-8000-000000000002'::uuid, '21d3fe2c-ac1e-46f2-b1d5-897011bca21d'::uuid, 20),
    ('61000000-0000-4000-8000-000000000002'::uuid, '81a5e372-fbc2-48a2-810e-33a3eed136b4'::uuid, 15),
    ('61000000-0000-4000-8000-000000000002'::uuid, 'e1eb1331-deff-4241-a51c-ede1eec78c76'::uuid, 15),
    ('61000000-0000-4000-8000-000000000003'::uuid, '70c57562-6f7f-45a5-9ce1-12eab48faa47'::uuid, 20),
    ('61000000-0000-4000-8000-000000000003'::uuid, '2855664c-1408-4dfa-ac4b-1e80f3899487'::uuid, 15),
    ('61000000-0000-4000-8000-000000000003'::uuid, '6ce3fd0e-9044-43fd-b418-4f057d5c175f'::uuid, 10),
    ('61000000-0000-4000-8000-000000000004'::uuid, '73000000-0000-4000-8000-000000000003'::uuid, 20),
    ('61000000-0000-4000-8000-000000000004'::uuid, '73000000-0000-4000-8000-000000000004'::uuid, 20),
    ('61000000-0000-4000-8000-000000000005'::uuid, '73000000-0000-4000-8000-000000000005'::uuid, 20),
    ('61000000-0000-4000-8000-000000000005'::uuid, '73000000-0000-4000-8000-000000000006'::uuid, 20),
    ('61000000-0000-4000-8000-000000000006'::uuid, '73000000-0000-4000-8000-000000000007'::uuid, 20),
    ('61000000-0000-4000-8000-000000000006'::uuid, '73000000-0000-4000-8000-000000000008'::uuid, 15),
    ('61000000-0000-4000-8000-000000000007'::uuid, '70c57562-6f7f-45a5-9ce1-12eab48faa47'::uuid, 15),
    ('61000000-0000-4000-8000-000000000007'::uuid, '2855664c-1408-4dfa-ac4b-1e80f3899487'::uuid, 10),
    ('61000000-0000-4000-8000-000000000007'::uuid, '73000000-0000-4000-8000-000000000009'::uuid, 20)
) as seed (module_id, skill_id, points_awarded);

insert into public.training_paths (
  id,
  title,
  description,
  path_type,
  is_active,
  estimated_duration_hours,
  is_mandatory,
  certificate_enabled,
  target_department_id,
  created_by
)
select
  seed.id,
  seed.title,
  seed.description,
  seed.path_type,
  true,
  seed.estimated_duration_hours,
  seed.is_mandatory,
  seed.certificate_enabled,
  case seed.department_key
    when 'front_office' then ctx.front_office_department_id
    when 'housekeeping' then ctx.housekeeping_department_id
    when 'finance' then ctx.finance_department_id
    when 'engineering' then ctx.engineering_department_id
    when 'security' then ctx.security_department_id
    when 'hr' then ctx.hr_department_id
    else null
  end,
  ctx.created_by
from (
  values
    ('62000000-0000-4000-8000-000000000001'::uuid, 'Prime Compliance Essentials', 'Group-wide safety and digital compliance path for all active staff.', 'custom', 2, true, true, null),
    ('62000000-0000-4000-8000-000000000002'::uuid, 'Front Office Service Excellence', 'Arrival, disclosure, and departure standards for front office and guest relations teams.', 'department', 2, true, true, 'front_office'),
    ('62000000-0000-4000-8000-000000000003'::uuid, 'Housekeeping Room Readiness', 'Room turnover and room release standards for housekeeping operations.', 'department', 2, true, true, 'housekeeping'),
    ('62000000-0000-4000-8000-000000000004'::uuid, 'Finance Controls & Audit Readiness', 'Cash handling and reconciliation control path for finance and night audit teams.', 'department', 2, true, true, 'finance'),
    ('62000000-0000-4000-8000-000000000005'::uuid, 'Engineering Maintenance & Safety', 'Preventive maintenance and safety path for engineering operations.', 'department', 2, true, true, 'engineering'),
    ('62000000-0000-4000-8000-000000000006'::uuid, 'Security Operations Readiness', 'Security incident response and safety path for security teams.', 'department', 2, true, true, 'security'),
    ('62000000-0000-4000-8000-000000000007'::uuid, 'Prime New Hire Orientation', 'Orientation path for new hires covering onboarding, emergency readiness, and digital hygiene.', 'new_hire', 2, true, true, 'hr')
) as seed (id, title, description, path_type, estimated_duration_hours, is_mandatory, certificate_enabled, department_key)
cross join tmp_seed_context ctx
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  path_type = excluded.path_type,
  is_active = excluded.is_active,
  estimated_duration_hours = excluded.estimated_duration_hours,
  is_mandatory = excluded.is_mandatory,
  certificate_enabled = excluded.certificate_enabled,
  target_department_id = excluded.target_department_id,
  created_by = excluded.created_by;

delete from public.training_path_modules
where path_id in (
  '62000000-0000-4000-8000-000000000001'::uuid,
  '62000000-0000-4000-8000-000000000002'::uuid,
  '62000000-0000-4000-8000-000000000003'::uuid,
  '62000000-0000-4000-8000-000000000004'::uuid,
  '62000000-0000-4000-8000-000000000005'::uuid,
  '62000000-0000-4000-8000-000000000006'::uuid,
  '62000000-0000-4000-8000-000000000007'::uuid
);

insert into public.training_path_modules (id, path_id, module_id, sequence, is_mandatory)
select gen_random_uuid(), seed.path_id, seed.module_id, seed.sequence, true
from (
  values
    ('62000000-0000-4000-8000-000000000001'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 1),
    ('62000000-0000-4000-8000-000000000001'::uuid, '61000000-0000-4000-8000-000000000004'::uuid, 2),
    ('62000000-0000-4000-8000-000000000002'::uuid, '5d54ecee-7731-4b83-adf3-14b795eaa092'::uuid, 1),
    ('62000000-0000-4000-8000-000000000002'::uuid, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 2),
    ('62000000-0000-4000-8000-000000000003'::uuid, '61000000-0000-4000-8000-000000000002'::uuid, 1),
    ('62000000-0000-4000-8000-000000000003'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 2),
    ('62000000-0000-4000-8000-000000000004'::uuid, '61000000-0000-4000-8000-000000000005'::uuid, 1),
    ('62000000-0000-4000-8000-000000000004'::uuid, '61000000-0000-4000-8000-000000000004'::uuid, 2),
    ('62000000-0000-4000-8000-000000000005'::uuid, '61000000-0000-4000-8000-000000000006'::uuid, 1),
    ('62000000-0000-4000-8000-000000000005'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 2),
    ('62000000-0000-4000-8000-000000000006'::uuid, '61000000-0000-4000-8000-000000000007'::uuid, 1),
    ('62000000-0000-4000-8000-000000000006'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 2),
    ('62000000-0000-4000-8000-000000000007'::uuid, '61000000-0000-4000-8000-000000000001'::uuid, 1),
    ('62000000-0000-4000-8000-000000000007'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 2),
    ('62000000-0000-4000-8000-000000000007'::uuid, '61000000-0000-4000-8000-000000000004'::uuid, 3)
) as seed (path_id, module_id, sequence);

delete from public.user_path_enrollments
where path_id in (
  '62000000-0000-4000-8000-000000000001'::uuid,
  '62000000-0000-4000-8000-000000000002'::uuid,
  '62000000-0000-4000-8000-000000000003'::uuid,
  '62000000-0000-4000-8000-000000000004'::uuid,
  '62000000-0000-4000-8000-000000000005'::uuid,
  '62000000-0000-4000-8000-000000000006'::uuid
);

insert into public.user_path_enrollments (id, user_id, path_id)
select gen_random_uuid(), p.id, '62000000-0000-4000-8000-000000000001'::uuid
from public.profiles p
where coalesce(p.is_active, true)
  and not coalesce(p.is_deleted, false);

insert into public.user_path_enrollments (id, user_id, path_id)
select distinct gen_random_uuid(), ud.user_id, seed.path_id
from public.user_departments ud
join tmp_department_groups dg on dg.department_id = ud.department_id
join (
  values
    ('front_office'::text, '62000000-0000-4000-8000-000000000002'::uuid),
    ('housekeeping'::text, '62000000-0000-4000-8000-000000000003'::uuid),
    ('finance'::text, '62000000-0000-4000-8000-000000000004'::uuid),
    ('engineering'::text, '62000000-0000-4000-8000-000000000005'::uuid),
    ('security'::text, '62000000-0000-4000-8000-000000000006'::uuid)
) as seed (group_key, path_id) on seed.group_key = dg.group_key;

delete from public.learning_assignments
where content_id in (
  '5d54ecee-7731-4b83-adf3-14b795eaa092'::uuid,
  '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid,
  '61000000-0000-4000-8000-000000000001'::uuid,
  '61000000-0000-4000-8000-000000000002'::uuid,
  '61000000-0000-4000-8000-000000000003'::uuid,
  '61000000-0000-4000-8000-000000000004'::uuid,
  '61000000-0000-4000-8000-000000000005'::uuid,
  '61000000-0000-4000-8000-000000000006'::uuid,
  '61000000-0000-4000-8000-000000000007'::uuid
)
and target_type in ('department', 'everyone');

insert into public.learning_assignments (
  id, target_type, target_id, content_type, content_id, due_date, valid_from,
  priority, assigned_by, is_deleted, status, instructions,
  requires_acknowledgement, notify_on_due, reminder_days_before
)
select gen_random_uuid(), 'everyone', null, 'module', seed.content_id,
  timezone('utc', now()) + (seed.due_days * interval '1 day'),
  timezone('utc', now()), seed.priority, ctx.created_by, false, 'assigned',
  seed.instructions, true, true, array[14, 7, 3]::integer[]
from (
  values
    ('61000000-0000-4000-8000-000000000003'::uuid, 21, 'high', 'Complete the emergency response module to maintain active compliance status.'),
    ('61000000-0000-4000-8000-000000000004'::uuid, 30, 'high', 'Complete the cybersecurity module to maintain active compliance status.')
) as seed (content_id, due_days, priority, instructions)
cross join tmp_seed_context ctx;

insert into public.learning_assignments (
  id, target_type, target_id, content_type, content_id, due_date, valid_from,
  priority, assigned_by, is_deleted, status, instructions,
  requires_acknowledgement, notify_on_due, reminder_days_before
)
select gen_random_uuid(), 'department', dg.department_id::text, 'module', seed.content_id,
  timezone('utc', now()) + (seed.due_days * interval '1 day'),
  timezone('utc', now()), seed.priority, ctx.created_by, false, 'assigned',
  seed.instructions, true, true, array[14, 7, 3]::integer[]
from tmp_department_groups dg
join (
  values
    ('front_office'::text, '5d54ecee-7731-4b83-adf3-14b795eaa092'::uuid, 21, 'normal', 'Complete the Guest Rights and Stay Disclosure module as part of your front office compliance training.'),
    ('front_office'::text, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 30, 'normal', 'Complete the Front Office check-in and checkout module to align on arrival and departure standards.'),
    ('hr'::text, '61000000-0000-4000-8000-000000000001'::uuid, 21, 'normal', 'Complete the onboarding essentials module to standardize hiring and probation control.'),
    ('housekeeping'::text, '61000000-0000-4000-8000-000000000002'::uuid, 30, 'normal', 'Complete the room turnover SOP module to align on room readiness standards.'),
    ('finance'::text, '61000000-0000-4000-8000-000000000005'::uuid, 30, 'normal', 'Complete the cash handling and night audit module to maintain control discipline.'),
    ('engineering'::text, '61000000-0000-4000-8000-000000000006'::uuid, 30, 'normal', 'Complete the preventive maintenance module to align on safe execution and closure standards.'),
    ('security'::text, '61000000-0000-4000-8000-000000000007'::uuid, 30, 'normal', 'Complete the incident response module to align on scene control and reporting.')
) as seed (group_key, content_id, due_days, priority, instructions)
  on seed.group_key = dg.group_key
cross join tmp_seed_context ctx;

delete from public.training_assignment_rules
where training_module_id in (
  '5d54ecee-7731-4b83-adf3-14b795eaa092'::uuid,
  '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid,
  '61000000-0000-4000-8000-000000000001'::uuid,
  '61000000-0000-4000-8000-000000000002'::uuid,
  '61000000-0000-4000-8000-000000000005'::uuid,
  '61000000-0000-4000-8000-000000000006'::uuid,
  '61000000-0000-4000-8000-000000000007'::uuid
);

insert into public.training_assignment_rules (
  id, training_module_id, target_role, target_department_id, is_active, created_at, created_by, job_title_id
)
select gen_random_uuid(), seed.training_module_id, null, dg.department_id, true, timezone('utc', now()), ctx.created_by, null
from tmp_department_groups dg
join (
  values
    ('front_office'::text, '5d54ecee-7731-4b83-adf3-14b795eaa092'::uuid),
    ('front_office'::text, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid),
    ('hr'::text, '61000000-0000-4000-8000-000000000001'::uuid),
    ('housekeeping'::text, '61000000-0000-4000-8000-000000000002'::uuid),
    ('finance'::text, '61000000-0000-4000-8000-000000000005'::uuid),
    ('engineering'::text, '61000000-0000-4000-8000-000000000006'::uuid),
    ('security'::text, '61000000-0000-4000-8000-000000000007'::uuid)
) as seed (group_key, training_module_id) on seed.group_key = dg.group_key
cross join tmp_seed_context ctx;

insert into public.training_content_blocks (
  id,
  training_module_id,
  type,
  content,
  "order",
  created_at,
  content_data,
  is_mandatory,
  is_deleted,
  source_document_id,
  title,
  duration_seconds,
  points
)
select
  gen_random_uuid(),
  seed.training_module_id,
  seed.block_type::public.content_block_type,
  seed.content,
  seed.block_order,
  timezone('utc', now()),
  case
    when seed.block_type = 'quiz' then jsonb_build_object('quiz_id', seed.quiz_id::text)
    when seed.block_type = 'sop_reference' then jsonb_build_object('sop_id', seed.source_document_id::text)
    else '{}'::jsonb
  end,
  true,
  false,
  seed.source_document_id,
  seed.title,
  seed.duration_seconds,
  seed.points
from (
  values
    ('61000000-0000-4000-8000-000000000003'::uuid, 'text', 'Emergency response principles', $$Every employee must know how to raise the alarm, protect life, direct guests away from danger, and account for people at the assembly point.$$ , 0, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000003'::uuid, 'sop_reference', 'Emergency evacuation procedure', $$The linked procedure is the controlling standard for alarm escalation, stairwell use, assembly points, and all-clear authorization.$$ , 1, 'a1000008-0000-0000-0000-000000000002'::uuid, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000003'::uuid, 'text', 'Evacuation priorities', $$Protect guests, visitors, and vulnerable persons first. Elevators are not used during a fire event. Missing persons, blocked exits, and special assistance cases are reported immediately to the incident leader.$$ , 2, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000003'::uuid, 'text', 'Post-incident discipline', $$After the event or drill, supervisors must document headcount completion, variances, response gaps, and corrective actions. Re-entry is only allowed after formal all-clear.$$ , 3, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000003'::uuid, 'quiz', 'Emergency response assessment', $$Pass the assessment to confirm fire and evacuation readiness.$$ , 4, null::uuid, '63000000-0000-4000-8000-000000000003'::uuid, 180, 20),
    ('61000000-0000-4000-8000-000000000004'::uuid, 'text', 'Cybersecurity in hotel operations', $$Hotel systems hold guest identity, payment, contact, and reservation data. A single careless click, shared password, or unlocked workstation creates operational and legal risk.$$ , 0, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000004'::uuid, 'sop_reference', 'Cybersecurity policy reference', $$Use the policy for phishing, password, device, access, and guest-data handling rules.$$ , 1, 'a1000010-0000-0000-0000-000000000007'::uuid, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000004'::uuid, 'text', 'High-risk daily behaviors', $$Common hotel risks include leaving PMS sessions unlocked, forwarding guest documents to personal accounts, plugging in unknown devices, and approving suspicious MFA prompts.$$ , 2, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000004'::uuid, 'text', 'Reporting and containment', $$Staff must report suspected phishing, malware, credential compromise, or data exposure immediately. The priority is containment and escalation, not self-troubleshooting.$$ , 3, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000004'::uuid, 'quiz', 'Cybersecurity awareness assessment', $$Pass the assessment to confirm secure digital behavior in daily hotel operations.$$ , 4, null::uuid, '63000000-0000-4000-8000-000000000004'::uuid, 180, 20),
    ('61000000-0000-4000-8000-000000000005'::uuid, 'text', 'Cashiering and audit discipline', $$Cash handling requires documented counts, clean handovers, approved adjustments, and evidence-backed reconciliation. Fast service is never an excuse for weak controls.$$ , 0, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000005'::uuid, 'sop_reference', 'Cash handling and reconciliation SOP', $$Use the linked SOP for floats, drops, refunds, audit packets, and discrepancy escalation.$$ , 1, 'a1000007-0000-0000-0000-000000000008'::uuid, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000005'::uuid, 'text', 'Shift-end controls', $$Cash, vouchers, PMS totals, POS totals, and supporting approvals must reconcile before the shift closes. Overages and shortages are documented and escalated with supporting detail.$$ , 2, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000005'::uuid, 'text', 'Night audit checkpoints', $$Night audit teams validate postings, settlement status, house accounts, and unresolved exceptions before final close. Unresolved gaps are tracked, not buried.$$ , 3, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000005'::uuid, 'quiz', 'Cash handling and night audit assessment', $$Pass the assessment to confirm cashiering and nightly reconciliation control standards.$$ , 4, null::uuid, '63000000-0000-4000-8000-000000000005'::uuid, 180, 20),
    ('61000000-0000-4000-8000-000000000006'::uuid, 'text', 'Preventive maintenance purpose', $$Preventive maintenance protects guest comfort, plant reliability, and life-safety performance. Engineering work is complete only when the system is safe, documented, and released correctly.$$ , 0, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000006'::uuid, 'sop_reference', 'Work order and maintenance procedure', $$Use the linked procedure for planning, isolation, access coordination, documentation, and technical escalation.$$ , 1, 'a1000005-0000-0000-0000-000000000002'::uuid, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000006'::uuid, 'text', 'Safe execution and room access', $$Non-urgent maintenance in occupied rooms is coordinated with Front Office and, where required, the guest. Lockout and safe isolation rules apply whenever energized equipment is worked on.$$ , 2, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000006'::uuid, 'text', 'Work order closure', $$A work order closes only after the fault is resolved, readings or testing are recorded when applicable, parts used are logged, and the space is released back to operations.$$ , 3, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000006'::uuid, 'quiz', 'Preventive maintenance assessment', $$Pass the assessment to confirm engineering safety, coordination, and documentation standards.$$ , 4, null::uuid, '63000000-0000-4000-8000-000000000006'::uuid, 180, 20),
    ('61000000-0000-4000-8000-000000000007'::uuid, 'text', 'Incident response scope', $$Security teams protect people, preserve evidence, control access, and document facts without delay or unnecessary disclosure.$$ , 0, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000007'::uuid, 'sop_reference', 'Access control and incident management procedure', $$Use the linked procedure for scene management, key control, CCTV handling, incident classification, and reporting lines.$$ , 1, 'a1000008-0000-0000-0000-000000000008'::uuid, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000007'::uuid, 'text', 'Scene control and evidence protection', $$On a live incident, establish safety first, separate parties if needed, preserve evidence, restrict unnecessary access, and escalate according to severity.$$ , 2, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000007'::uuid, 'text', 'Reporting discipline', $$Incident reports must record time, location, parties involved, factual observations, actions taken, witnesses, and follow-up. Opinion and speculation do not belong in the report.$$ , 3, null::uuid, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000007'::uuid, 'quiz', 'Incident response assessment', $$Pass the assessment to confirm security incident handling and reporting standards.$$ , 4, null::uuid, '63000000-0000-4000-8000-000000000007'::uuid, 180, 20)
) as seed (
  training_module_id,
  block_type,
  title,
  content,
  block_order,
  source_document_id,
  quiz_id,
  duration_seconds,
  points
);

commit;
