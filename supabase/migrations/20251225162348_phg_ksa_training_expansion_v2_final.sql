-- PHASE 7: TRAINING EXPANSION (PART 2)

-- 1. MODULE 3: PMS Night Audit Specialist (Front Office)
INSERT INTO public.training_modules (
    id, title, description, department_id, is_active, 
    difficulty_level, estimated_duration, created_by, property_id, status
) VALUES (
    'e0000000-0000-0000-0007-000000000003', 
    'PHG Systems: Night Audit Specialist Certification', 
    'Advanced technical training on PMS reconciliation, trial balance, and daily business closure.',
    '00000000-0000-0000-0000-000000000001', 
    true, 
    'advanced', 
    '120 mins', 
    'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59', 
    'published'
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- 2. MODULE 4: Civil Defense & First Response (Security/Engineering)
INSERT INTO public.training_modules (
    id, title, description, department_id, is_active, 
    difficulty_level, estimated_duration, created_by, property_id, status
) VALUES (
    'e0000000-0000-0000-0007-000000000004', 
    'PHG Safety: Civil Defense & Emergency Response', 
    'Mandatory safety training covering KSA Civil Defense codes, fire suppression, and emergency protocols.',
    '00000000-0000-0000-0000-000000000007', 
    true, 
    'intermediate', 
    '60 mins', 
    'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59', 
    'published'
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- 3. QUIZZES FOR NEW MODULES
INSERT INTO public.quizzes (
    id, title, description, duration_minutes, passing_score, 
    status, created_by, property_id, training_id
) VALUES (
    'f0000000-0000-4000-a000-000000000003',
    'Night Audit Certification Exam',
    'Final assessment for the PMS Night Audit Specialist track.',
    30, 90, 'pending', 'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59', 'e0000000-0000-0000-0007-000000000003'
) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO public.quizzes (
    id, title, description, duration_minutes, passing_score, 
    status, created_by, property_id, training_id
) VALUES (
    'f0000000-0000-4000-a000-000000000004',
    'Emergency Response Assessment',
    'Verification of emergency code knowledge and first response protocols.',
    20, 100, 'pending', 'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59', 'e0000000-0000-0000-0007-000000000004'
) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- 4. QUIZ QUESTIONS
INSERT INTO public.quiz_questions (
    id, quiz_id, question_text, question_type, 
    option_a, option_b, option_c, option_d, 
    correct_answer, points, order_num
) VALUES 
(gen_random_uuid(), 'f0000000-0000-4000-a000-000000000003', 'What is the primary purpose of the Trial Balance in Night Audit?', 'multiple_choice', 'To check guest happiness', 'To ensure debits and credits balance', 'To print next day arrivals', 'To reset the system', 'B', 20, 1),
(gen_random_uuid(), 'f0000000-0000-4000-a000-000000000003', 'When should "No-Shows" be processed?', 'multiple_choice', 'At 10:00 AM', 'Before starting current day room charges', 'During breakfast', 'At checkout', 'B', 20, 2),
(gen_random_uuid(), 'f0000000-0000-4000-a000-000000000004', 'Which KSA Civil Defense code is for Fire/Smoke?', 'multiple_choice', 'Code Blue', 'Code Black', 'Code Red', 'Code Orange', 'C', 20, 1),
(gen_random_uuid(), 'f0000000-0000-4000-a000-000000000004', 'What is the evacuation distance for Code Orange?', 'multiple_choice', '10m', '50m', '500m', '1km', 'C', 20, 2);
;
