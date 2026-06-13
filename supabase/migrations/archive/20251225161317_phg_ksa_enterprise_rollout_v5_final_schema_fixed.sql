-- ATOMIC ENTERPRISE ROLLOUT FOR PHG KSA

-- 1. CLEANUP OLD CONTENT
DELETE FROM public.onboarding_tasks;
DELETE FROM public.onboarding_process;
DELETE FROM public.onboarding_templates;
DELETE FROM public.learning_progress;
DELETE FROM public.learning_assignments;
DELETE FROM public.training_modules;
DELETE FROM public.documents;

-- 2. STANDARDIZE DEPARTMENTS
DO $$
DECLARE
    v_prop_id UUID := '739771e0-08ff-4e07-992f-d2be1770aa59';
BEGIN
    INSERT INTO departments (id, name, property_id, is_active) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Front Office', v_prop_id, true),
    ('00000000-0000-0000-0000-000000000002', 'Housekeeping', v_prop_id, true),
    ('00000000-0000-0000-0000-000000000003', 'Food & Beverage', v_prop_id, true),
    ('00000000-0000-0000-0000-000000000004', 'Engineering', v_prop_id, true),
    ('00000000-0000-0000-0000-000000000005', 'Human Resources', v_prop_id, true),
    ('00000000-0000-0000-0000-000000000006', 'Finance', v_prop_id, true),
    ('00000000-0000-0000-0000-000000000007', 'Security', v_prop_id, true),
    ('00000000-0000-0000-0000-000000000008', 'Sales & Marketing', v_prop_id, true),
    ('00000000-0000-0000-0000-000000000009', 'IT', v_prop_id, true),
    ('00000000-0000-0000-0000-000000000010', 'Management', v_prop_id, true)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = true;
END $$;

-- 3. ESTABLISH PRODUCTION CATEGORIES
INSERT INTO categories (id, name, department_id) VALUES 
('c0000000-0000-0000-0000-000000000001', 'Governance & Compliance', '00000000-0000-0000-0000-000000000010'),
('c0000000-0000-0000-0000-000000000002', 'Operating Procedures', '00000000-0000-0000-0000-000000000010'),
('c0000000-0000-0000-0000-000000000003', 'Brand Standards', '00000000-0000-0000-0000-000000000010'),
('c0000000-0000-0000-0000-000000000004', 'Health, Safety & SFDA', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, department_id = EXCLUDED.department_id;

-- 4. INJECT PRODUCTION SOPS
INSERT INTO public.documents (id, title, content, status, category_id, department_id, visibility, created_by, property_id) VALUES 
('d0000000-0000-0000-0000-000000000001', 'Prime Hotels Group: Code of Business Conduct', '# PHG Code of Conduct\nAll staff must represent the brand with integrity and cultural respect.', 'PUBLISHED', 'c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'all_properties', 'a927ec40-0af0-47d7-8258-9decad0cac9c', '739771e0-08ff-4e07-992f-d2be1770aa59'),
('d0000000-0000-0000-0000-000000000002', 'KSA Labor Law Compliance (2025 Edition)', '# Labor Law GUIDE\nOfficial PHG guide for MHRSD compliance, Qiwa authentication.', 'PUBLISHED', 'c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'all_properties', 'a927ec40-0af0-47d7-8258-9decad0cac9c', '739771e0-08ff-4e07-992f-d2be1770aa59'),
('d0000000-0000-0000-0000-000000000003', 'Front Office SOP: Guest Interaction (Hafawah)', '# معايير الحفاوة السعودية\nتقديم الضيافة السعودية الأصيلة والترحيب الحار بجميع الضيوف.', 'PUBLISHED', 'c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'all_properties', 'a927ec40-0af0-47d7-8258-9decad0cac9c', '739771e0-08ff-4e07-992f-d2be1770aa59');

-- 5. INJECT PRODUCTION TRAINING MODULES
INSERT INTO public.training_modules (id, title, description, department_id, is_active, difficulty_level, estimated_duration, created_by, property_id, status) VALUES 
('e0000000-0000-0000-0000-000000000001', 'KSA Hospitality Specialist Certification', 'Mandatory brand orientation for all guest-facing staff in PHG properties.', '00000000-0000-0000-0000-000000000001', true, 'beginner', '60 mins', 'a927ec40-0af0-47d7-8258-9decad0cac9c', '739771e0-08ff-4e07-992f-d2be1770aa59', 'published');

-- 6. INJECT PRODUCTION ONBOARDING TEMPLATES
INSERT INTO public.onboarding_templates (id, title, role, department_id, is_active, tasks, job_title, required_training_ids) VALUES 
('b0000000-0000-0000-0000-000000000001', 'PHG Frontier Onboarding (Admin)', 'staff', '00000000-0000-0000-0000-000000000001', true, 
'[{"title": "Orientation", "due_day_offset": 0, "assignee_role": "self", "description": "Welcome to Prime."}]'::jsonb, 
'Front Desk Agent', ARRAY['e0000000-0000-0000-0000-000000000001']::UUID[]);
;
