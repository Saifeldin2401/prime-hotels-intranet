-- ENTERPRISE LIBRARY EXPANSION

-- 1. ADDITIONAL PRODUCTION SOPS
INSERT INTO public.documents (id, title, content, status, category_id, department_id, visibility, created_by, property_id) VALUES 
('d0000000-0000-0000-d000-000000000006', 'Engineering: Preventive Maintenance Schedule', '# بروتوكول الصيانة الوقائية\nدليل الصيانة الدورية لأنظمة التكييف والكهرباء والسباكة لضمان استمرارية التشغيل.', 'PUBLISHED', 'c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'all_properties', 'a927ec40-0af0-47d7-8258-9decad0cac9c', '739771e0-08ff-4e07-992f-d2be1770aa59'),
('d0000000-0000-0000-d000-000000000007', 'Sales: PHG Brand Positioning & Market Strategy', '# Brand Positioning\nStrategic overview of PHG positioning in the premium hotel segment in Riyadh and Jeddah.', 'PUBLISHED', 'c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000008', 'all_properties', 'a927ec40-0af0-47d7-8258-9decad0cac9c', '739771e0-08ff-4e07-992f-d2be1770aa59'),
('d0000000-0000-0000-d000-000000000008', 'Security: Incident Reporting & Investigation', '# بروتوكول الإبلاغ عن الحوادث\nخطوات التعامل مع الحوادث الأمنية والتحقيق فيها ورفع التقارير للإدارة.', 'PUBLISHED', 'c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000007', 'all_properties', 'a927ec40-0af0-47d7-8258-9decad0cac9c', '739771e0-08ff-4e07-992f-d2be1770aa59');

-- 2. ADDITIONAL PRODUCTION TRAINING TRACKS
INSERT INTO public.training_modules (id, title, description, department_id, is_active, difficulty_level, estimated_duration, created_by, property_id, status) VALUES 
('e0000000-0000-0000-e000-000000000003', 'Professional Housekeeping Standards', 'Advanced certification on chemical handling, room inspection, and premium housekeeping standards.', '00000000-0000-0000-0000-000000000002', true, 'intermediate', '90 mins', 'a927ec40-0af0-47d7-8258-9decad0cac9c', '739771e0-08ff-4e07-992f-d2be1770aa59', 'published');

-- 3. ADDITIONAL ONBOARDING TEMPLATES (HK)
INSERT INTO public.onboarding_templates (id, title, role, department_id, is_active, tasks, job_title, required_training_ids) VALUES 
('b0000000-0000-0000-b000-000000000002', 'Housekeeping Specialist Onboarding', 'staff', '00000000-0000-0000-0000-000000000002', true, 
'[
    {"title": "Day 1: Safety & Chemicals", "due_day_offset": 0, "assignee_role": "self", "description": "Review safety guidelines."},
    {"title": "Room Inspection Standards", "due_day_offset": 5, "assignee_role": "self", "description": "Review Housekeeping SOP.", "link_type": "document", "link_id": "d0000000-0000-0000-0000-000000000004"}
]'::jsonb, 
'Room Attendant', ARRAY['e0000000-0000-0000-e000-000000000001', 'e0000000-0000-0000-e000-000000000003']::UUID[]);
;
