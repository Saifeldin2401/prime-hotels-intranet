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
where name in ('Security', 'Security & Safety');

insert into public.learning_quizzes (
  id,
  title,
  description,
  time_limit_minutes,
  passing_score_percentage,
  max_attempts,
  randomize_questions,
  show_feedback_during,
  status,
  created_by,
  linked_sop_id,
  is_deleted,
  training_module_id,
  source_document_id
)
select
  seed.id,
  seed.title,
  seed.description,
  seed.time_limit_minutes,
  seed.passing_score_percentage,
  3,
  false,
  true,
  'published',
  ctx.created_by,
  null,
  false,
  seed.training_module_id,
  null
from (
  values
    ('508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid, 'Front Office Check-in & Checkout Operational Quiz', 'Operational quiz covering arrival verification, room release, privacy handling, folio control, and service recovery.', 18, 80, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid),
    ('63000000-0000-4000-8000-000000000001'::uuid, 'HR New Hire Onboarding Essentials Quiz', 'Operational quiz covering onboarding controls, employment documentation, access approval, and probation follow-up.', 15, 80, '61000000-0000-4000-8000-000000000001'::uuid),
    ('63000000-0000-4000-8000-000000000002'::uuid, 'Housekeeping Room Turnover Quiz', 'Operational quiz covering room turnover sequence, room release, defect escalation, and lost and found handling.', 15, 80, '61000000-0000-4000-8000-000000000002'::uuid),
    ('63000000-0000-4000-8000-000000000003'::uuid, 'Emergency Fire & Evacuation Quiz', 'Emergency readiness quiz covering alarm activation, evacuation priorities, assembly control, and post-incident reporting.', 12, 85, '61000000-0000-4000-8000-000000000003'::uuid),
    ('63000000-0000-4000-8000-000000000004'::uuid, 'Cybersecurity Awareness Quiz', 'Digital security quiz covering phishing, credential hygiene, workstation controls, and guest data handling.', 12, 85, '61000000-0000-4000-8000-000000000004'::uuid),
    ('63000000-0000-4000-8000-000000000005'::uuid, 'Cash Handling & Night Audit Quiz', 'Finance control quiz covering float counts, refunds, reconciliation, and unresolved discrepancy handling.', 15, 85, '61000000-0000-4000-8000-000000000005'::uuid),
    ('63000000-0000-4000-8000-000000000006'::uuid, 'Preventive Maintenance Walkthrough Quiz', 'Engineering quiz covering safe isolation, occupied-room coordination, work order closure, and recurring fault escalation.', 15, 85, '61000000-0000-4000-8000-000000000006'::uuid),
    ('63000000-0000-4000-8000-000000000007'::uuid, 'Incident Response & Reporting Quiz', 'Security quiz covering scene safety, evidence protection, key control, and reporting standards.', 15, 85, '61000000-0000-4000-8000-000000000007'::uuid)
) as seed (id, title, description, time_limit_minutes, passing_score_percentage, training_module_id)
cross join tmp_seed_context ctx
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  time_limit_minutes = excluded.time_limit_minutes,
  passing_score_percentage = excluded.passing_score_percentage,
  max_attempts = excluded.max_attempts,
  randomize_questions = excluded.randomize_questions,
  show_feedback_during = excluded.show_feedback_during,
  status = excluded.status,
  created_by = excluded.created_by,
  linked_sop_id = excluded.linked_sop_id,
  is_deleted = excluded.is_deleted,
  training_module_id = excluded.training_module_id,
  source_document_id = excluded.source_document_id,
  updated_at = timezone('utc', now());

update public.training_content_blocks
set
  title = 'Front Office check-in and checkout assessment',
  content_data = jsonb_build_object('quiz_id', '508f359f-86cd-4b40-879e-7367c0b9db2e')
where training_module_id = '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid
  and type = 'quiz';

delete from public.training_content_blocks
where training_module_id in (
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
    else '{}'::jsonb
  end,
  true,
  false,
  null,
  seed.title,
  seed.duration_seconds,
  seed.points
from (
  values
    ('61000000-0000-4000-8000-000000000001'::uuid, 'text', 'Onboarding scope', $$This module prepares new hires and line managers for a clean Day 1 start. The goal is simple: complete every onboarding control, confirm every reporting line, and remove avoidable delays from the first week.$$ , 0, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000001'::uuid, 'text', 'Day 1 control points', $$Do not release full access, payroll setup, or scheduling until identity documents, signed employment paperwork, and approval workflows are complete. Missing items are escalated the same day.$$ , 1, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000001'::uuid, 'text', 'Probation ownership', $$Probation goals, conduct expectations, and departmental standards are not HR-only tasks. Department heads and supervisors own follow-up and must record first-week expectations clearly.$$ , 2, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000001'::uuid, 'text', 'Documentation discipline', $$Employee records remain inside approved HR channels. No personal apps, open folders, or verbal-only handoffs are acceptable for sensitive onboarding records.$$ , 3, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000001'::uuid, 'quiz', 'HR onboarding assessment', $$Pass the quiz to confirm operational onboarding readiness.$$ , 4, '63000000-0000-4000-8000-000000000001'::uuid, 180, 20),

    ('61000000-0000-4000-8000-000000000002'::uuid, 'text', 'Room turnover standard', $$Housekeeping turnover protects room readiness, cleanliness, safety, and asset control. A room is not released because cleaning started; it is released because the full standard is complete.$$ , 0, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000002'::uuid, 'text', 'Sequence and separation', $$Follow the room sequence methodically and prevent cross-contamination between bathroom, bedroom, minibar, and public-touch surfaces. Shortcuts create service failures and hygiene risk.$$ , 1, null::uuid, 300, 10),
    ('61000000-0000-4000-8000-000000000002'::uuid, 'text', 'Lost and found control', $$Any item discovered in a room is bagged, labeled, logged, and transferred through the lost-and-found process immediately. Nothing stays loose on the trolley or in a pantry.$$ , 2, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000002'::uuid, 'text', 'Defect escalation', $$If housekeeping finds leaks, AC faults, safety issues, or broken fittings, the room is held and maintenance is notified. A partly resolved defect is not a ready room.$$ , 3, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000002'::uuid, 'quiz', 'Room turnover assessment', $$Pass the quiz to confirm room readiness and escalation standards.$$ , 4, '63000000-0000-4000-8000-000000000002'::uuid, 180, 20),

    ('61000000-0000-4000-8000-000000000003'::uuid, 'text', 'Emergency response principles', $$Every employee must know how to raise the alarm, protect life, direct guests away from danger, and support headcount at the assembly point.$$ , 0, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000003'::uuid, 'text', 'Evacuation priorities', $$Protect guests, visitors, and vulnerable persons first. Elevators are not used during fire response, and blocked exits or missing persons are reported immediately.$$ , 1, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000003'::uuid, 'text', 'Assembly discipline', $$Assembly points are controlled locations. Supervisors confirm headcount, report missing persons, and wait for the incident leader before any re-entry is considered.$$ , 2, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000003'::uuid, 'text', 'Post-incident closure', $$After a drill or live event, document response gaps, escalation timing, headcount completion, and corrective actions. Readiness improves only when the event is reviewed.$$ , 3, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000003'::uuid, 'quiz', 'Emergency response assessment', $$Pass the quiz to confirm fire and evacuation readiness.$$ , 4, '63000000-0000-4000-8000-000000000003'::uuid, 180, 20),

    ('61000000-0000-4000-8000-000000000004'::uuid, 'text', 'Cybersecurity in hotel operations', $$Hotel systems hold guest identity, payment, contact, and reservation data. A single careless click, shared password, or unlocked workstation creates operational and legal risk.$$ , 0, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000004'::uuid, 'text', 'Common daily failures', $$Typical failures include clicking phishing links, approving unexpected MFA prompts, forwarding documents to personal accounts, and plugging unknown devices into hotel equipment.$$ , 1, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000004'::uuid, 'text', 'Secure guest data handling', $$Guest identity and reservation data move only through approved secure systems and authorized channels. Convenience is never a justification for bypassing controls.$$ , 2, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000004'::uuid, 'text', 'Escalation and containment', $$When phishing, malware, credential exposure, or suspicious account behavior is detected, report it immediately and contain the issue rather than attempting private fixes.$$ , 3, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000004'::uuid, 'quiz', 'Cybersecurity awareness assessment', $$Pass the quiz to confirm safe daily digital behavior.$$ , 4, '63000000-0000-4000-8000-000000000004'::uuid, 180, 20),

    ('61000000-0000-4000-8000-000000000005'::uuid, 'text', 'Cashiering control principles', $$Cash handling requires documented counts, clean handovers, approved adjustments, and evidence-backed reconciliation. Fast service does not override financial control.$$ , 0, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000005'::uuid, 'text', 'Shift-end controls', $$Cash, vouchers, PMS totals, POS totals, and approvals must reconcile before the shift closes. Overages and shortages are documented and escalated immediately.$$ , 1, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000005'::uuid, 'text', 'Refund and variance governance', $$Refunds follow delegated approval rules. Variances are investigated with records, not balanced privately or hidden for the next shift.$$ , 2, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000005'::uuid, 'text', 'Night audit checkpoints', $$Night audit validates postings, settlement status, house accounts, and unresolved exceptions before final close. Unresolved gaps are handed over with complete documentation.$$ , 3, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000005'::uuid, 'quiz', 'Cash handling and night audit assessment', $$Pass the quiz to confirm cashiering and nightly reconciliation control standards.$$ , 4, '63000000-0000-4000-8000-000000000005'::uuid, 180, 20),

    ('61000000-0000-4000-8000-000000000006'::uuid, 'text', 'Preventive maintenance purpose', $$Preventive maintenance protects guest comfort, plant reliability, and life-safety performance. Engineering work is only complete when the system is safe, documented, and released correctly.$$ , 0, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000006'::uuid, 'text', 'Safe execution', $$Before work starts on energized equipment, isolate the source and apply the required safety controls. PPE is not a substitute for isolation.$$ , 1, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000006'::uuid, 'text', 'Operational coordination', $$Non-urgent maintenance in occupied rooms is coordinated with Front Office and, where needed, the guest. Engineering never bypasses room-access protocol.$$ , 2, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000006'::uuid, 'text', 'Closure and reliability', $$A work order closes only after fault resolution, required readings or tests, documented parts, and handback to operations. Repeated faults trigger root-cause review.$$ , 3, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000006'::uuid, 'quiz', 'Preventive maintenance assessment', $$Pass the quiz to confirm engineering safety, coordination, and documentation standards.$$ , 4, '63000000-0000-4000-8000-000000000006'::uuid, 180, 20),

    ('61000000-0000-4000-8000-000000000007'::uuid, 'text', 'Incident response scope', $$Security teams protect people, preserve evidence, control access, and document facts without delay or unnecessary disclosure.$$ , 0, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000007'::uuid, 'text', 'Scene safety first', $$Respond to altercations or suspicious events by protecting safety, calling support, and controlling the scene before investigation begins.$$ , 1, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000007'::uuid, 'text', 'Evidence and key control', $$Evidence is preserved, not rearranged. Lost master keys and access-control breaches are escalated immediately and managed through formal property response.$$ , 2, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000007'::uuid, 'text', 'Reporting discipline', $$Incident reports record facts, time, location, parties, actions taken, and witnesses. Opinion and rumor do not belong in the official report.$$ , 3, null::uuid, 240, 10),
    ('61000000-0000-4000-8000-000000000007'::uuid, 'quiz', 'Incident response assessment', $$Pass the quiz to confirm security incident handling and reporting standards.$$ , 4, '63000000-0000-4000-8000-000000000007'::uuid, 180, 20)
) as seed (
  training_module_id,
  block_type,
  title,
  content,
  block_order,
  quiz_id,
  duration_seconds,
  points
);

create temporary table tmp_seed_questions (
  id uuid,
  quiz_id uuid,
  module_id uuid,
  question_text text,
  question_type public.question_type,
  difficulty_level public.question_difficulty,
  correct_answer text,
  explanation text,
  display_order integer,
  option_a text,
  option_b text,
  option_c text,
  option_d text
) on commit drop;

insert into tmp_seed_questions (
  id,
  quiz_id,
  module_id,
  question_text,
  question_type,
  difficulty_level,
  correct_answer,
  explanation,
  display_order,
  option_a,
  option_b,
  option_c,
  option_d
)
values
  ('74000000-0000-4000-8000-000000000101'::uuid, '508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'Before issuing a room key, what must be confirmed first?', 'mcq', 'medium', 'Guest identity, reservation details, and room readiness', 'Key issuance follows identity, reservation, and room status verification.', 1, 'Guest identity, reservation details, and room readiness', 'Only whether the porter is available', 'Only the guest''s breakfast preference', 'Only whether the room rate has increased'),
  ('74000000-0000-4000-8000-000000000102'::uuid, '508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'A guest arrives early and the room is not ready. What is the best response?', 'mcq', 'medium', 'Explain the delay, offer assistance, and provide the best available ready-time update', 'Front Office must manage expectations clearly and coordinate next steps.', 2, 'Explain the delay, offer assistance, and provide the best available ready-time update', 'Tell the guest to return later without logging the case', 'Issue a key anyway and hope housekeeping finishes', 'Ask the guest to wait without explanation'),
  ('74000000-0000-4000-8000-000000000103'::uuid, '508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'True or False: Room numbers should be handled discreetly and not announced loudly in a crowded lobby.', 'true_false', 'easy', 'True', 'Privacy controls apply during every arrival interaction.', 3, 'True', 'False', null, null),
  ('74000000-0000-4000-8000-000000000104'::uuid, '508f359f-86cd-4b40-879e-7367c0b9db2e'::uuid, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'At checkout, what best protects revenue and accuracy?', 'mcq', 'medium', 'Confirm unsettled charges and the payment method before closing the folio', 'A clean folio close depends on charge review and payment confirmation.', 4, 'Confirm unsettled charges and the payment method before closing the folio', 'Close the folio immediately if the lobby is busy', 'Skip disputed charges until the next shift', 'Handwrite the balance and close later'),

  ('74000000-0000-4000-8000-000000000201'::uuid, '63000000-0000-4000-8000-000000000001'::uuid, '61000000-0000-4000-8000-000000000001'::uuid, 'What must be complete before a new hire receives full system access?', 'mcq', 'medium', 'Identity documents, signed paperwork, and access approval', 'Access is released only after documentation and approval are complete.', 1, 'Identity documents, signed paperwork, and access approval', 'Only the manager''s verbal confirmation', 'Only uniform sizing', 'Only the employee ID photo'),
  ('74000000-0000-4000-8000-000000000202'::uuid, '63000000-0000-4000-8000-000000000001'::uuid, '61000000-0000-4000-8000-000000000001'::uuid, 'Who owns follow-up on probation expectations?', 'mcq', 'medium', 'The line manager, supported by HR', 'Probation follow-up is an operational management task, not HR alone.', 2, 'The line manager, supported by HR', 'Only payroll', 'Only the employee', 'Only the general manager'),
  ('74000000-0000-4000-8000-000000000203'::uuid, '63000000-0000-4000-8000-000000000001'::uuid, '61000000-0000-4000-8000-000000000001'::uuid, 'True or False: Employee records may be shared through personal messaging apps if the request is urgent.', 'true_false', 'easy', 'False', 'Sensitive HR records must remain inside approved channels.', 3, 'True', 'False', null, null),
  ('74000000-0000-4000-8000-000000000204'::uuid, '63000000-0000-4000-8000-000000000001'::uuid, '61000000-0000-4000-8000-000000000001'::uuid, 'If payroll details are missing near cutoff, what is the right action?', 'mcq', 'medium', 'Escalate immediately to HR or payroll and document the gap', 'Payroll-impacting gaps are escalated immediately, not discovered after the run.', 4, 'Escalate immediately to HR or payroll and document the gap', 'Wait for the next cycle without telling anyone', 'Pay cash informally', 'Delete the onboarding record and restart'),

  ('74000000-0000-4000-8000-000000000301'::uuid, '63000000-0000-4000-8000-000000000002'::uuid, '61000000-0000-4000-8000-000000000002'::uuid, 'What happens before deep cleaning starts in a vacant dirty room?', 'mcq', 'medium', 'Secure the room and check for lost items or visible defects', 'Turnover begins with room control and early issue identification.', 1, 'Secure the room and check for lost items or visible defects', 'Change all linen before looking around the room', 'Mark the room ready immediately', 'Ignore defects until the end of the shift'),
  ('74000000-0000-4000-8000-000000000302'::uuid, '63000000-0000-4000-8000-000000000002'::uuid, '61000000-0000-4000-8000-000000000002'::uuid, 'How must guest property left in a room be handled?', 'mcq', 'medium', 'Bag it, label it, log it, and hand it over through lost and found procedure', 'Lost items are controlled immediately and remain auditable.', 2, 'Bag it, label it, log it, and hand it over through lost and found procedure', 'Leave it on the trolley until later', 'Keep it in the pantry for the supervisor', 'Place it in the room safe and move on'),
  ('74000000-0000-4000-8000-000000000303'::uuid, '63000000-0000-4000-8000-000000000002'::uuid, '61000000-0000-4000-8000-000000000002'::uuid, 'True or False: A room can be released if only one amenity is missing but the rest of the cleaning is done.', 'true_false', 'easy', 'False', 'Room readiness means the full standard is complete.', 3, 'True', 'False', null, null),
  ('74000000-0000-4000-8000-000000000304'::uuid, '63000000-0000-4000-8000-000000000002'::uuid, '61000000-0000-4000-8000-000000000002'::uuid, 'What should happen if housekeeping finds an AC leak during turnover?', 'mcq', 'medium', 'Report maintenance immediately and hold the room until assessed', 'Defective rooms are not released for sale until assessed.', 4, 'Report maintenance immediately and hold the room until assessed', 'Ignore it if the room looks clean', 'Release the room and mention it later', 'Move the guest to the room and wait for complaint'),

  ('74000000-0000-4000-8000-000000000401'::uuid, '63000000-0000-4000-8000-000000000003'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 'If smoke or fire is confirmed, what is the first action?', 'mcq', 'medium', 'Raise the alarm and start the emergency response procedure immediately', 'Immediate alarm activation starts the formal emergency response.', 1, 'Raise the alarm and start the emergency response procedure immediately', 'Wait for management approval first', 'Call a colleague quietly and investigate alone', 'Use the elevator to check other floors'),
  ('74000000-0000-4000-8000-000000000402'::uuid, '63000000-0000-4000-8000-000000000003'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 'Who receives priority support during evacuation?', 'mcq', 'medium', 'Guests needing assistance, children, and other vulnerable persons', 'Evacuation priorities are based on life safety and vulnerability.', 2, 'Guests needing assistance, children, and other vulnerable persons', 'Only VIP guests', 'Only staff on duty', 'Only the finance office'),
  ('74000000-0000-4000-8000-000000000403'::uuid, '63000000-0000-4000-8000-000000000003'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 'True or False: Elevators may be used during a fire evacuation if they are faster than stairs.', 'true_false', 'easy', 'False', 'Elevators are not used during fire evacuation unless a specialized plan explicitly provides otherwise.', 3, 'True', 'False', null, null),
  ('74000000-0000-4000-8000-000000000404'::uuid, '63000000-0000-4000-8000-000000000003'::uuid, '61000000-0000-4000-8000-000000000003'::uuid, 'When can re-entry happen after evacuation?', 'mcq', 'medium', 'Only after the incident leader gives the all-clear', 'Re-entry is formally controlled after headcount and incident assessment.', 4, 'Only after the incident leader gives the all-clear', 'Once the alarm stops ringing', 'As soon as staff want to collect belongings', 'Whenever a supervisor guesses it is safe'),

  ('74000000-0000-4000-8000-000000000501'::uuid, '63000000-0000-4000-8000-000000000004'::uuid, '61000000-0000-4000-8000-000000000004'::uuid, 'You receive an urgent email asking you to confirm your password. What should you do?', 'mcq', 'medium', 'Do not click, report it as phishing, and follow the security process', 'Credential harvesting attempts must be reported, not tested.', 1, 'Do not click, report it as phishing, and follow the security process', 'Reply with the password to confirm identity', 'Forward it to a personal email for later review', 'Click the link from a mobile phone instead'),
  ('74000000-0000-4000-8000-000000000502'::uuid, '63000000-0000-4000-8000-000000000004'::uuid, '61000000-0000-4000-8000-000000000004'::uuid, 'What should happen before leaving a workstation unattended?', 'mcq', 'medium', 'Lock the screen or log out', 'Workstation control is a basic cyber hygiene standard.', 2, 'Lock the screen or log out', 'Ask a colleague to watch it from across the room', 'Leave it open if the desk is busy', 'Turn the monitor brightness down'),
  ('74000000-0000-4000-8000-000000000503'::uuid, '63000000-0000-4000-8000-000000000004'::uuid, '61000000-0000-4000-8000-000000000004'::uuid, 'True or False: An unexpected MFA prompt can indicate account compromise and should be denied and reported.', 'true_false', 'easy', 'True', 'Unexpected MFA prompts may signal compromise and require immediate reporting.', 3, 'True', 'False', null, null),
  ('74000000-0000-4000-8000-000000000504'::uuid, '63000000-0000-4000-8000-000000000004'::uuid, '61000000-0000-4000-8000-000000000004'::uuid, 'How should guest identity documents be shared internally when required?', 'mcq', 'medium', 'Only through approved secure systems and authorized channels', 'Guest documents stay inside controlled systems and roles.', 4, 'Only through approved secure systems and authorized channels', 'Through any personal messaging app if urgent', 'On an open shared folder', 'By printing and leaving them at reception'),

  ('74000000-0000-4000-8000-000000000601'::uuid, '63000000-0000-4000-8000-000000000005'::uuid, '61000000-0000-4000-8000-000000000005'::uuid, 'When should the float be counted?', 'mcq', 'medium', 'At the start and end of the shift during formal handover', 'Opening and closing counts anchor accountability for cash on hand.', 1, 'At the start and end of the shift during formal handover', 'Only when a shortage is suspected', 'Only once per week', 'Only when the drawer feels heavy'),
  ('74000000-0000-4000-8000-000000000602'::uuid, '63000000-0000-4000-8000-000000000005'::uuid, '61000000-0000-4000-8000-000000000005'::uuid, 'What is the correct response to an overage or shortage?', 'mcq', 'medium', 'Recount, document the variance, and notify the supervisor immediately', 'Variances must be validated and escalated with documentation.', 2, 'Recount, document the variance, and notify the supervisor immediately', 'Balance it using personal cash', 'Ignore it if the amount is small', 'Ask the next shift to investigate later'),
  ('74000000-0000-4000-8000-000000000603'::uuid, '63000000-0000-4000-8000-000000000005'::uuid, '61000000-0000-4000-8000-000000000005'::uuid, 'True or False: A cashier may approve their own refund if the guest is waiting.', 'true_false', 'easy', 'False', 'Refund approval follows delegated control, not self-approval.', 3, 'True', 'False', null, null),
  ('74000000-0000-4000-8000-000000000604'::uuid, '63000000-0000-4000-8000-000000000005'::uuid, '61000000-0000-4000-8000-000000000005'::uuid, 'During night audit, what should happen to an unresolved discrepancy?', 'mcq', 'medium', 'Escalate and document it before final close', 'Unresolved variances are tracked and escalated, not buried.', 4, 'Escalate and document it before final close', 'Ignore it if the amount is low', 'Delete the record to keep reports clean', 'Wait for month end to review'),

  ('74000000-0000-4000-8000-000000000701'::uuid, '63000000-0000-4000-8000-000000000006'::uuid, '61000000-0000-4000-8000-000000000006'::uuid, 'What must happen before maintenance starts on energized equipment?', 'mcq', 'medium', 'Isolate the equipment and apply required safety controls', 'Safe isolation comes before repair work.', 1, 'Isolate the equipment and apply required safety controls', 'Begin troubleshooting and isolate later', 'Only wear gloves and start work', 'Ask another technician to watch from a distance'),
  ('74000000-0000-4000-8000-000000000702'::uuid, '63000000-0000-4000-8000-000000000006'::uuid, '61000000-0000-4000-8000-000000000006'::uuid, 'What must be updated after a guestroom repair is completed?', 'mcq', 'medium', 'Work order notes, parts used, and room release status', 'A repair is complete only when the record and release are complete.', 2, 'Work order notes, parts used, and room release status', 'Only the technician initials', 'Nothing if the guest is satisfied', 'Only the maintenance WhatsApp group'),
  ('74000000-0000-4000-8000-000000000703'::uuid, '63000000-0000-4000-8000-000000000006'::uuid, '61000000-0000-4000-8000-000000000006'::uuid, 'True or False: Engineering may enter an occupied room for non-urgent work without coordination if the job is quick.', 'true_false', 'easy', 'False', 'Occupied-room access must be coordinated and controlled.', 3, 'True', 'False', null, null),
  ('74000000-0000-4000-8000-000000000704'::uuid, '63000000-0000-4000-8000-000000000006'::uuid, '61000000-0000-4000-8000-000000000006'::uuid, 'What should repeated technical faults trigger?', 'mcq', 'medium', 'A root-cause review and preventive action plan', 'Recurring faults signal a reliability problem, not a one-off task.', 4, 'A root-cause review and preventive action plan', 'Only another quick repair', 'No action if the room is vacant', 'A note to revisit next quarter'),

  ('74000000-0000-4000-8000-000000000801'::uuid, '63000000-0000-4000-8000-000000000007'::uuid, '61000000-0000-4000-8000-000000000007'::uuid, 'What is the first priority when responding to an altercation?', 'mcq', 'medium', 'Protect safety, call for support, and separate the parties if possible', 'Security response starts with life safety and scene control.', 1, 'Protect safety, call for support, and separate the parties if possible', 'Start interviewing witnesses immediately', 'Wait for a manager before acting', 'Leave the scene until CCTV is checked'),
  ('74000000-0000-4000-8000-000000000802'::uuid, '63000000-0000-4000-8000-000000000007'::uuid, '61000000-0000-4000-8000-000000000007'::uuid, 'What is the correct response to a lost master key?', 'mcq', 'medium', 'Escalate immediately and start the property key-control response', 'Master key incidents require immediate escalation and formal control response.', 2, 'Escalate immediately and start the property key-control response', 'Wait until the end of the shift to avoid disruption', 'Ask housekeeping to keep looking quietly', 'Record it tomorrow if the key is still missing'),
  ('74000000-0000-4000-8000-000000000803'::uuid, '63000000-0000-4000-8000-000000000007'::uuid, '61000000-0000-4000-8000-000000000007'::uuid, 'True or False: CCTV footage can be shared with any supervisor who asks for it.', 'true_false', 'easy', 'False', 'CCTV access is controlled and limited to authorized use.', 3, 'True', 'False', null, null),
  ('74000000-0000-4000-8000-000000000804'::uuid, '63000000-0000-4000-8000-000000000007'::uuid, '61000000-0000-4000-8000-000000000007'::uuid, 'Which information belongs in an incident report?', 'mcq', 'medium', 'Facts, times, location, people involved, and actions taken', 'Good reports document facts and actions, not assumptions.', 4, 'Facts, times, location, people involved, and actions taken', 'Only the final outcome', 'Only the officer opinion', 'Only a short verbal summary');

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
  null,
  45,
  5,
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
  q.id,
  opt.option_text,
  opt.option_text = q.correct_answer,
  opt.ordinality - 1,
  case
    when opt.option_text = q.correct_answer then 'Correct.'
    else 'Incorrect. Review the module guidance and operational standard.'
  end
from tmp_seed_questions q
cross join lateral unnest(array[q.option_a, q.option_b, q.option_c, q.option_d]) with ordinality as opt(option_text, ordinality)
where opt.option_text is not null;

delete from public.learning_quiz_questions
where quiz_id in (
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
  q.quiz_id,
  q.id,
  q.display_order,
  5
from tmp_seed_questions q;

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
    ('2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, '78eb4552-8026-43ec-88e9-bdcfad1fa542'::uuid, 20),
    ('2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 'f0138b4e-ff14-459d-beaf-5d286f84cab0'::uuid, 20),
    ('2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, '4159f317-0db2-4d34-897b-fc5b064d6c4d'::uuid, 10),
    ('61000000-0000-4000-8000-000000000001'::uuid, '73000000-0000-4000-8000-000000000001'::uuid, 20),
    ('61000000-0000-4000-8000-000000000001'::uuid, '73000000-0000-4000-8000-000000000002'::uuid, 15),
    ('61000000-0000-4000-8000-000000000002'::uuid, '21d3fe2c-ac1e-46f2-b1d5-897011bca21d'::uuid, 20),
    ('61000000-0000-4000-8000-000000000002'::uuid, '81a5e372-fbc2-48a2-810e-33a3eed136b4'::uuid, 15),
    ('61000000-0000-4000-8000-000000000003'::uuid, '70c57562-6f7f-45a5-9ce1-12eab48faa47'::uuid, 20),
    ('61000000-0000-4000-8000-000000000003'::uuid, '2855664c-1408-4dfa-ac4b-1e80f3899487'::uuid, 15),
    ('61000000-0000-4000-8000-000000000004'::uuid, '73000000-0000-4000-8000-000000000003'::uuid, 20),
    ('61000000-0000-4000-8000-000000000004'::uuid, '73000000-0000-4000-8000-000000000004'::uuid, 20),
    ('61000000-0000-4000-8000-000000000005'::uuid, '73000000-0000-4000-8000-000000000005'::uuid, 20),
    ('61000000-0000-4000-8000-000000000005'::uuid, '73000000-0000-4000-8000-000000000006'::uuid, 20),
    ('61000000-0000-4000-8000-000000000006'::uuid, '73000000-0000-4000-8000-000000000007'::uuid, 20),
    ('61000000-0000-4000-8000-000000000006'::uuid, '73000000-0000-4000-8000-000000000008'::uuid, 15),
    ('61000000-0000-4000-8000-000000000007'::uuid, '70c57562-6f7f-45a5-9ce1-12eab48faa47'::uuid, 15),
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
    when 'front_office' then (select department_id from tmp_department_groups where group_key = 'front_office' limit 1)
    when 'housekeeping' then (select department_id from tmp_department_groups where group_key = 'housekeeping' limit 1)
    when 'finance' then (select department_id from tmp_department_groups where group_key = 'finance' limit 1)
    when 'engineering' then (select department_id from tmp_department_groups where group_key = 'engineering' limit 1)
    when 'security' then (select department_id from tmp_department_groups where group_key = 'security' limit 1)
    when 'hr' then (select department_id from tmp_department_groups where group_key = 'hr' limit 1)
    else null
  end,
  ctx.created_by
from (
  values
    ('62000000-0000-4000-8000-000000000001'::uuid, 'Prime Compliance Essentials', 'Group-wide safety and digital compliance path for all active staff.', 'custom', 2, true, true, null),
    ('62000000-0000-4000-8000-000000000002'::uuid, 'Front Office Service Excellence', 'Arrival, disclosure, and departure standards for Front Office and Guest Relations teams.', 'department', 2, true, true, 'front_office'),
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
    ('62000000-0000-4000-8000-000000000004'::uuid, '61000000-0000-4000-8000-000000000005'::uuid, 1),
    ('62000000-0000-4000-8000-000000000005'::uuid, '61000000-0000-4000-8000-000000000006'::uuid, 1),
    ('62000000-0000-4000-8000-000000000006'::uuid, '61000000-0000-4000-8000-000000000007'::uuid, 1),
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
  '62000000-0000-4000-8000-000000000006'::uuid,
  '62000000-0000-4000-8000-000000000007'::uuid
);

insert into public.user_path_enrollments (id, user_id, path_id)
select gen_random_uuid(), p.id, '62000000-0000-4000-8000-000000000001'::uuid
from public.profiles p
where coalesce(p.is_active, true)
  and not coalesce(p.is_deleted, false);

insert into public.user_path_enrollments (id, user_id, path_id)
select gen_random_uuid(), dedup.user_id, dedup.path_id
from (
  select distinct ud.user_id, seed.path_id
  from public.user_departments ud
  join tmp_department_groups dg on dg.department_id = ud.department_id
  join (
    values
      ('front_office'::text, '62000000-0000-4000-8000-000000000002'::uuid),
      ('housekeeping'::text, '62000000-0000-4000-8000-000000000003'::uuid),
      ('finance'::text, '62000000-0000-4000-8000-000000000004'::uuid),
      ('engineering'::text, '62000000-0000-4000-8000-000000000005'::uuid),
      ('security'::text, '62000000-0000-4000-8000-000000000006'::uuid),
      ('hr'::text, '62000000-0000-4000-8000-000000000007'::uuid)
  ) as seed (group_key, path_id) on seed.group_key = dg.group_key
) as dedup;

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
select
  gen_random_uuid(),
  'everyone',
  null,
  'module',
  seed.content_id,
  timezone('utc', now()) + (seed.due_days * interval '1 day'),
  timezone('utc', now()),
  seed.priority,
  ctx.created_by,
  false,
  'assigned',
  seed.instructions,
  true,
  true,
  array[14, 7, 3]::integer[]
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
select
  gen_random_uuid(),
  'department',
  dg.department_id::text,
  'module',
  seed.content_id,
  timezone('utc', now()) + (seed.due_days * interval '1 day'),
  timezone('utc', now()),
  seed.priority,
  ctx.created_by,
  false,
  'assigned',
  seed.instructions,
  true,
  true,
  array[14, 7, 3]::integer[]
from tmp_department_groups dg
join (
  values
    ('front_office'::text, '5d54ecee-7731-4b83-adf3-14b795eaa092'::uuid, 21, 'normal', 'Complete the Guest Rights and Stay Disclosure module as part of front office compliance training.'),
    ('front_office'::text, '2ec5b4fd-eed7-4961-be0f-d24287bb30d9'::uuid, 30, 'normal', 'Complete the Front Office check-in and checkout module to align on arrival and departure standards.'),
    ('hr'::text, '61000000-0000-4000-8000-000000000001'::uuid, 21, 'normal', 'Complete the onboarding essentials module to standardize hiring and probation control.'),
    ('housekeeping'::text, '61000000-0000-4000-8000-000000000002'::uuid, 30, 'normal', 'Complete the room turnover module to align on room readiness standards.'),
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

commit;
