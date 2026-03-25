begin;

-- Create context for IDs
create temporary table tmp_seed_context on commit drop as
select
  'a927ec40-0af0-47d7-8258-9decad0cac9c'::uuid as created_by;

-- Determine dynamic department mapping
create temporary table tmp_department_groups on commit drop as
(select 'fnb'::text as group_key, id as department_id from public.departments where name ilike '%Food%' or name ilike '%F&B%' or name ilike '%Beverage%' limit 1)
union all
(select 'sales'::text, id from public.departments where name ilike '%Sales%' or name ilike '%Marketing%' limit 1)
union all
(select 'gm'::text, id from public.departments where name ilike '%Executive%' or name ilike '%General Management%' or name ilike '%Management%' limit 1);

-- 1. Insert Training Modules
insert into public.training_modules (
  id, title, description, estimated_duration_minutes, created_by, updated_by, property_id,
  category, status, difficulty_level, estimated_duration, is_active, department_id,
  validity_period_days, certificate_enabled, allow_retake, max_attempts, auto_advance,
  show_feedback, randomize_questions, show_answers, time_limit_minutes, audience,
  content_language, passing_score_percentage, is_deleted
)
select
  seed.id, seed.title, seed.description, seed.estimated_duration_minutes, ctx.created_by, ctx.created_by, null,
  seed.category, 'published', seed.difficulty_level, seed.estimated_duration, true,
  d.department_id, 365, true, true, 3, true, true, false, true, seed.time_limit_minutes,
  seed.audience, 'en', seed.passing_score_percentage, false
from (
  values
    ('81000000-0000-4000-8000-000000000001'::uuid, 'Food Safety & Hygiene Basics (HACCP Level 1)', 'Introductory food safety covering time & temperature controls, cross-contamination, and personal hygiene.', 30, 'operations', 'beginner', '30 minutes', 'fnb', 30, 80, 'All F&B Staff'),
    ('81000000-0000-4000-8000-000000000002'::uuid, 'Table Service & Upselling Techniques', 'Sequence of service, suggestive selling, allergy handling, and complaint defusion.', 40, 'operations', 'intermediate', '40 minutes', 'fnb', 40, 80, 'Servers, Captains, Supervisors'),
    ('81000000-0000-4000-8000-000000000003'::uuid, 'Brand Standards & Hotel Fact Sheet', 'Key selling points, brand voice, and competitive set basics for property sales.', 30, 'brand', 'beginner', '30 minutes', 'sales', 30, 85, 'Sales Execs, Marketing Staff'),
    ('81000000-0000-4000-8000-000000000004'::uuid, 'Corporate Account Contracting & Negotiation', 'Rate parity, volume discounts, contracting steps, and corporate relationship building.', 45, 'skills', 'advanced', '45 minutes', 'sales', 45, 85, 'Senior Sales Managers'),
    ('81000000-0000-4000-8000-000000000005'::uuid, 'P&L Reading and Cost Control for Managers', 'GOP, GOPPAR, flow-through, and basic cost control strategies across departments.', 60, 'finance', 'intermediate', '60 minutes', 'gm', 60, 85, 'Department Heads, ASys Managers'),
    ('81000000-0000-4000-8000-000000000006'::uuid, 'Crisis Leadership & Media Relations', 'Action plans during major property crises, holding statements, and emergency comms.', 45, 'leadership', 'advanced', '45 minutes', 'gm', 45, 90, 'Executive Committee, GMs')
) as seed (id, title, description, estimated_duration_minutes, category, difficulty_level, estimated_duration, department_key, time_limit_minutes, passing_score_percentage, audience)
cross join tmp_seed_context ctx
left join tmp_department_groups d on seed.department_key = d.group_key
on conflict (id) do update set title = excluded.title, description = excluded.description;

-- 2. Insert Learning Quizzes
insert into public.learning_quizzes (
  id, title, description, time_limit_minutes, passing_score_percentage, status, created_by, training_module_id
)
select
  seed.id, seed.title, seed.description, seed.duration_minutes, seed.passing_score, 'published', ctx.created_by, seed.training_id
from (
  values
    ('83000000-0000-4000-8000-000000000001'::uuid, 'Food Safety Quiz', 'Tests basic HACCP knowledge', 15, 80, '81000000-0000-4000-8000-000000000001'::uuid),
    ('83000000-0000-4000-8000-000000000002'::uuid, 'Table Service Quiz', 'Tests sequencing and upselling', 15, 80, '81000000-0000-4000-8000-000000000002'::uuid),
    ('83000000-0000-4000-8000-000000000003'::uuid, 'Brand Standards Quiz', 'Tests property facts', 15, 85, '81000000-0000-4000-8000-000000000003'::uuid),
    ('83000000-0000-4000-8000-000000000004'::uuid, 'Corporate Contracting Quiz', 'Tests negotiation principles', 20, 85, '81000000-0000-4000-8000-000000000004'::uuid),
    ('83000000-0000-4000-8000-000000000005'::uuid, 'P&L Analysis Quiz', 'Tests financial acumen', 25, 85, '81000000-0000-4000-8000-000000000005'::uuid),
    ('83000000-0000-4000-8000-000000000006'::uuid, 'Crisis Leadership Quiz', 'Tests media and emergency handling', 20, 90, '81000000-0000-4000-8000-000000000006'::uuid)
) as seed(id, title, description, duration_minutes, passing_score, training_id)
cross join tmp_seed_context ctx
on conflict (id) do update set title = excluded.title;

-- 3. Insert Training Content Blocks
insert into public.training_content_blocks (
  id, training_module_id, type, content, "order", created_at, content_data, is_mandatory, is_deleted, duration_seconds, points
)
select
  gen_random_uuid(), seed.module_id, seed.block_type::public.content_block_type, seed.content, seed.block_order, timezone('utc', now()),
  case when seed.block_type = 'quiz' then jsonb_build_object('quiz_id', seed.quiz_id::text) else '{}'::jsonb end,
  true, false, seed.duration_seconds, 10
from (
  values
    ('81000000-0000-4000-8000-000000000001'::uuid, 'text', 'Welcome to Food Safety Basics. We will cover the temperature danger zone (5°C to 60°C) and cross-contamination rules.', 0, null::uuid, 300),
    ('81000000-0000-4000-8000-000000000001'::uuid, 'text', 'Always use separate cutting boards for raw chicken and fresh vegetables. Wash hands for 20 seconds. Wear gloves or use tongs when plating ready-to-eat foods.', 1, null::uuid, 300),
    ('81000000-0000-4000-8000-000000000001'::uuid, 'quiz', 'Complete the food safety assessment', 2, '83000000-0000-4000-8000-000000000001'::uuid, 120),
    
    ('81000000-0000-4000-8000-000000000002'::uuid, 'text', 'Great table service requires reading the guest. Anticipate needs, clear empty plates swiftly (from the right, serve from the left), and maintain eye contact.', 0, null::uuid, 300),
    ('81000000-0000-4000-8000-000000000002'::uuid, 'text', 'Upselling is not pushing; it is recommending. E.g., "Would you prefer sparkling or still water with your steak?" instead of just "Water?". Focus on pairings.', 1, null::uuid, 300),
    ('81000000-0000-4000-8000-000000000002'::uuid, 'quiz', 'Complete the table service assessment', 2, '83000000-0000-4000-8000-000000000002'::uuid, 120),
    
    ('81000000-0000-4000-8000-000000000003'::uuid, 'text', 'Our brand identity relies on an authentic, refined experience. Every sales pitch must align with our core standards of luxury and local heritage.', 0, null::uuid, 300),
    ('81000000-0000-4000-8000-000000000003'::uuid, 'quiz', 'Complete the brand standards assessment', 1, '83000000-0000-4000-8000-000000000003'::uuid, 120),
    
    ('81000000-0000-4000-8000-000000000004'::uuid, 'text', 'Corporate accounts demand consistency. Negotiate based on total account value (room nights + F&B + banquet), not just ADR.', 0, null::uuid, 400),
    ('81000000-0000-4000-8000-000000000004'::uuid, 'quiz', 'Complete the corporate contracting assessment', 1, '83000000-0000-4000-8000-000000000004'::uuid, 120),
    
    ('81000000-0000-4000-8000-000000000005'::uuid, 'text', 'A department P&L shows revenue versus departmental expenses. Gross Operating Profit (GOP) is the key metric for overall hotel operating efficiency.', 0, null::uuid, 400),
    ('81000000-0000-4000-8000-000000000005'::uuid, 'quiz', 'Complete the P&L reading assessment', 1, '83000000-0000-4000-8000-000000000005'::uuid, 120),
    
    ('81000000-0000-4000-8000-000000000006'::uuid, 'text', 'In a crisis, control the narrative. Establish a clear chain of command. "Holding statements" buy time while avoiding speculation or admitting fault without evidence.', 0, null::uuid, 400),
    ('81000000-0000-4000-8000-000000000006'::uuid, 'quiz', 'Complete the Crisis Leadership assessment', 1, '83000000-0000-4000-8000-000000000006'::uuid, 120)
) as seed(module_id, block_type, content, block_order, quiz_id, duration_seconds);

-- 4. Insert Knowledge Questions
insert into public.knowledge_questions (
  id, question_text, question_type, difficulty_level, correct_answer, explanation,
  estimated_time_seconds, points, status, version, created_by, training_module_id
)
select
  seed.id, seed.question_text, seed.question_type::public.question_type, seed.difficulty_level::public.question_difficulty, seed.correct_answer, seed.explanation,
  45, 5, 'published', 1, ctx.created_by, seed.module_id
from (
  values
    ('81000000-0000-4000-8000-100000000001'::uuid, 'What is the temperature danger zone for food storage?', 'mcq', 'easy', '5°C to 60°C', 'Bacteria multiply rapidly between these temperatures.', '81000000-0000-4000-8000-000000000001'::uuid),
    ('81000000-0000-4000-8000-100000000002'::uuid, 'True or False: Using the same cutting board for raw poultry and vegetables is acceptable if you wipe it with a dry towel.', 'true_false', 'easy', 'False', 'This is a severe cross-contamination risk. You must use separate boards or clean and sanitize fully.', '81000000-0000-4000-8000-000000000001'::uuid),
    
    ('81000000-0000-4000-8000-200000000001'::uuid, 'Which is an example of suggestive selling?', 'mcq', 'medium', '"Would you prefer sparkling or still water with your steak?"', 'It offers specific, elevated choices rather than a simple yes/no.', '81000000-0000-4000-8000-000000000002'::uuid),
    ('81000000-0000-4000-8000-200000000002'::uuid, 'From which side should you clear empty plates?', 'mcq', 'easy', 'From the right side', 'Serve from the left, clear from the right is the standard rule.', '81000000-0000-4000-8000-000000000002'::uuid),
    
    ('81000000-0000-4000-8000-300000000001'::uuid, 'What is the most important element of brand standards during a property tour?', 'mcq', 'medium', 'Aligning the property features with the client’s specific needs', 'Features tell, benefits sell. Tailor the tour.', '81000000-0000-4000-8000-000000000003'::uuid),
    ('81000000-0000-4000-8000-400000000001'::uuid, 'When negotiating a corporate deal, what matters besides Room ADR?', 'mcq', 'hard', 'Total account value including F&B and Meeting spend', 'Corporate accounts drive holistic revenue, not just room nights.', '81000000-0000-4000-8000-000000000004'::uuid),
    
    ('81000000-0000-4000-8000-500000000001'::uuid, 'What does GOP stand for?', 'mcq', 'medium', 'Gross Operating Profit', 'GOP evaluates the operational efficiency before fixed charges.', '81000000-0000-4000-8000-000000000005'::uuid),
    ('81000000-0000-4000-8000-600000000001'::uuid, 'What is the primary purpose of a Holding Statement in a crisis?', 'mcq', 'hard', 'To acknowledge the situation and buy time to gather facts without admitting unverified liability', 'It controls the narrative immediately without risk.', '81000000-0000-4000-8000-000000000006'::uuid)
) as seed(id, question_text, question_type, difficulty_level, correct_answer, explanation, module_id)
cross join tmp_seed_context ctx
on conflict (id) do update set question_text = excluded.question_text;

-- 5. Insert Options
insert into public.knowledge_question_options (id, question_id, option_text, is_correct, display_order, feedback)
select gen_random_uuid(), seed.q_id, seed.txt, seed.correct, seed.ord, seed.fb
from (
  values
    ('81000000-0000-4000-8000-100000000001'::uuid, '5°C to 60°C', true, 1, 'Correct. Pathogens grow here.'),
    ('81000000-0000-4000-8000-100000000001'::uuid, '-10°C to 0°C', false, 2, 'This is freezing.'),
    ('81000000-0000-4000-8000-100000000002'::uuid, 'True', false, 1, 'Dry towels do not sanitize.'),
    ('81000000-0000-4000-8000-100000000002'::uuid, 'False', true, 2, 'Correct. Separation or washing is mandatory.'),
    
    ('81000000-0000-4000-8000-200000000001'::uuid, '"Would you prefer sparkling or still water with your steak?"', true, 1, 'Correct.'),
    ('81000000-0000-4000-8000-200000000001'::uuid, '"Do you want water?"', false, 2, 'This is an open yes/no without upselling.'),
    ('81000000-0000-4000-8000-200000000002'::uuid, 'From the right side', true, 1, 'Correct.'),
    ('81000000-0000-4000-8000-200000000002'::uuid, 'From the left side', false, 2, 'Serve from the left, clear from the right.'),
    
    ('81000000-0000-4000-8000-300000000001'::uuid, 'Aligning the property features with the client’s specific needs', true, 1, 'Correct.'),
    ('81000000-0000-4000-8000-300000000001'::uuid, 'Showing every room type', false, 2, 'Tailor the tour.'),
    
    ('81000000-0000-4000-8000-400000000001'::uuid, 'Total account value including F&B and Meeting spend', true, 1, 'Correct.'),
    ('81000000-0000-4000-8000-400000000001'::uuid, 'Only the room ADR', false, 2, 'Total Revenue matters more.'),
    
    ('81000000-0000-4000-8000-500000000001'::uuid, 'Gross Operating Profit', true, 1, 'Correct.'),
    ('81000000-0000-4000-8000-500000000001'::uuid, 'Gross Over Pricing', false, 2, 'Incorrect terminology.'),
    
    ('81000000-0000-4000-8000-600000000001'::uuid, 'To acknowledge the situation and buy time to gather facts without admitting unverified liability', true, 1, 'Correct.'),
    ('81000000-0000-4000-8000-600000000001'::uuid, 'To immediately apologize and take all blame', false, 2, 'Never assume blame completely before facts are clear.')
) as seed(q_id, txt, correct, ord, fb);

-- 6. Link questions to quizzes
insert into public.learning_quiz_questions (id, quiz_id, question_id, display_order, points_override)
select gen_random_uuid(), seed.quiz_id, seed.question_id, seed.ord, 10
from (
  values
    ('83000000-0000-4000-8000-000000000001'::uuid, '81000000-0000-4000-8000-100000000001'::uuid, 1),
    ('83000000-0000-4000-8000-000000000001'::uuid, '81000000-0000-4000-8000-100000000002'::uuid, 2),
    ('83000000-0000-4000-8000-000000000002'::uuid, '81000000-0000-4000-8000-200000000001'::uuid, 1),
    ('83000000-0000-4000-8000-000000000002'::uuid, '81000000-0000-4000-8000-200000000002'::uuid, 2),
    ('83000000-0000-4000-8000-000000000003'::uuid, '81000000-0000-4000-8000-300000000001'::uuid, 1),
    ('83000000-0000-4000-8000-000000000004'::uuid, '81000000-0000-4000-8000-400000000001'::uuid, 1),
    ('83000000-0000-4000-8000-000000000005'::uuid, '81000000-0000-4000-8000-500000000001'::uuid, 1),
    ('83000000-0000-4000-8000-000000000006'::uuid, '81000000-0000-4000-8000-600000000001'::uuid, 1)
) as seed(quiz_id, question_id, ord);

-- 7. Insert paths
insert into public.training_paths (
  id, title, description, path_type, is_active, estimated_duration_hours,
  is_mandatory, certificate_enabled, target_department_id, created_by
)
select
  seed.id, seed.title, seed.description, 'department', true, seed.estimated_duration_hours,
  true, true, d.department_id, ctx.created_by
from (
  values
    ('82000000-0000-4000-8000-000000000001'::uuid, 'F&B Service Excellence', 'Path linking food safety and proactive service.', 2, 'fnb'),
    ('82000000-0000-4000-8000-000000000002'::uuid, 'Proactive Hotel Sales', 'Brand standards and negotiation tactics.', 2, 'sales'),
    ('82000000-0000-4000-8000-000000000003'::uuid, 'Leadership & Financial Acumen', 'P&L management and crisis readiness.', 2, 'gm')
) as seed (id, title, description, estimated_duration_hours, department_key)
cross join tmp_seed_context ctx
left join tmp_department_groups d on seed.department_key = d.group_key
on conflict (id) do update set title = excluded.title;

-- 8. Maps paths to modules
insert into public.training_path_modules (id, path_id, module_id, sequence, is_mandatory)
select gen_random_uuid(), seed.path_id, seed.module_id, seed.sequence, true
from (
  values
    ('82000000-0000-4000-8000-000000000001'::uuid, '81000000-0000-4000-8000-000000000001'::uuid, 1),
    ('82000000-0000-4000-8000-000000000001'::uuid, '81000000-0000-4000-8000-000000000002'::uuid, 2),
    ('82000000-0000-4000-8000-000000000002'::uuid, '81000000-0000-4000-8000-000000000003'::uuid, 1),
    ('82000000-0000-4000-8000-000000000002'::uuid, '81000000-0000-4000-8000-000000000004'::uuid, 2),
    ('82000000-0000-4000-8000-000000000003'::uuid, '81000000-0000-4000-8000-000000000005'::uuid, 1),
    ('82000000-0000-4000-8000-000000000003'::uuid, '81000000-0000-4000-8000-000000000006'::uuid, 2)
) as seed(path_id, module_id, sequence);

commit;
