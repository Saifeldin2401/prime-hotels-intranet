-- Migration: 20260901200000_enterprise_saas_architecture_unification.sql
-- Description: Unifies enterprise multi-tenant domain architecture, migrates training modules & quizzes, establishes question banks, drops obsolete property/ERP tables.

-- 1. Enums
ALTER TYPE assessment_type ADD VALUE IF NOT EXISTS 'quiz';
ALTER TYPE assessment_type ADD VALUE IF NOT EXISTS 'exam';
ALTER TYPE assessment_type ADD VALUE IF NOT EXISTS 'diagnostic';
ALTER TYPE assessment_type ADD VALUE IF NOT EXISTS 'certification';

ALTER TYPE assessment_placement ADD VALUE IF NOT EXISTS 'standalone';
ALTER TYPE assessment_placement ADD VALUE IF NOT EXISTS 'sop_checkpoint';

-- 2. Check Constraints
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_placement_ref_present;
ALTER TABLE assessments ADD CONSTRAINT assessments_placement_ref_present
  CHECK (placement IN ('certification'::assessment_placement, 'standalone'::assessment_placement) OR (placement_ref_id IS NOT NULL));

-- 3. Data Backfill
UPDATE documents SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE training_modules SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE learning_quizzes SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE unified_questions SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE departments SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- 4. Migrate training_modules into courses
INSERT INTO courses (
    id,
    title,
    description,
    status,
    difficulty_level,
    category,
    content_language,
    estimated_duration_minutes,
    passing_score_percentage,
    certificate_enabled,
    allow_retake,
    max_attempts,
    department_id,
    hotel_id,
    scope_type,
    is_master_template,
    master_source_id,
    blueprint,
    quality_score,
    source_training_module_id,
    created_by,
    updated_by,
    created_at,
    updated_at,
    is_deleted,
    organization_id
)
SELECT 
    tm.id,
    tm.title,
    tm.description,
    COALESCE(tm.status, 'draft'),
    COALESCE(tm.difficulty_level, 'beginner'),
    COALESCE(tm.category, 'hospitality'),
    COALESCE(tm.content_language, 'en'),
    COALESCE(tm.estimated_duration_minutes, 30),
    COALESCE(tm.passing_score_percentage, 80),
    COALESCE(tm.certificate_enabled, true),
    COALESCE(tm.allow_retake, true),
    tm.max_attempts,
    tm.department_id,
    tm.hotel_id,
    COALESCE(tm.scope_type, 'organization'),
    COALESCE(tm.is_master_template, false),
    tm.master_source_id,
    tm.blueprint,
    tm.quality_score,
    tm.id,
    tm.created_by,
    tm.updated_by,
    COALESCE(tm.created_at, now()),
    COALESCE(tm.updated_at, now()),
    COALESCE(tm.is_deleted, false),
    COALESCE(tm.organization_id, 'e0000000-0000-0000-0000-000000000001')
FROM training_modules tm
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    difficulty_level = EXCLUDED.difficulty_level,
    category = EXCLUDED.category,
    estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
    passing_score_percentage = EXCLUDED.passing_score_percentage,
    organization_id = EXCLUDED.organization_id;

-- 5. Default Question Banks
INSERT INTO question_banks (id, organization_id, name, name_ar, description, is_active, is_master_template)
VALUES 
  ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'General Hospitality & Etiquette', 'الضيافة العامة والبروتوكول', 'Core hospitality principles, guest service, and luxury standards', true, true),
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Front Office Operations', 'عمليات المكاتب الأمامية', 'Front desk, VIP check-in, concierge, and communication', true, true),
  ('b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'Food & Beverage Service', 'خدمة الأغذية والمشروبات', 'Dining service excellence, table settings, and food safety', true, true),
  ('b0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'Housekeeping & Cleanliness Standards', 'معايير النظافة والتدبير الفندقي', 'Room readiness, inspection protocols, and linen standards', true, true)
ON CONFLICT (id) DO NOTHING;

-- 6. Associate orphaned unified_questions with default question bank
UPDATE unified_questions 
SET question_bank_id = 'b0000000-0000-0000-0000-000000000001'
WHERE question_bank_id IS NULL;

-- 7. Migrate learning_quizzes into assessments
INSERT INTO assessments (
    id,
    title,
    description,
    assessment_type,
    placement,
    placement_ref_id,
    time_limit_minutes,
    max_attempts,
    passing_score,
    randomization,
    question_bank_id,
    pool_draw_count,
    show_feedback,
    status,
    source_quiz_id,
    created_by,
    created_at,
    updated_at,
    is_deleted,
    organization_id,
    scope_type,
    is_master_template
)
SELECT
    lq.id,
    lq.title,
    lq.description,
    'quiz'::assessment_type,
    'standalone'::assessment_placement,
    lq.training_module_id,
    lq.time_limit_minutes,
    COALESCE(lq.max_attempts, 3),
    COALESCE(lq.passing_score_percentage, 80),
    jsonb_build_object('randomize_questions', COALESCE(lq.randomize_questions, true), 'randomize_answers', COALESCE(lq.randomize_answers, true)),
    'b0000000-0000-0000-0000-000000000001',
    10,
    COALESCE(lq.show_feedback_during, true),
    COALESCE(lq.status::text, 'published'),
    lq.id,
    lq.created_by,
    COALESCE(lq.created_at, now()),
    COALESCE(lq.updated_at, now()),
    COALESCE(lq.is_deleted, false),
    COALESCE(lq.organization_id, 'e0000000-0000-0000-0000-000000000001'),
    'organization',
    false
FROM learning_quizzes lq
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    passing_score = EXCLUDED.passing_score,
    organization_id = EXCLUDED.organization_id;

-- 8. Drop legacy foreign keys & tables
ALTER TABLE IF EXISTS announcements DROP CONSTRAINT IF EXISTS announcements_property_id_fkey;
ALTER TABLE IF EXISTS certificates DROP CONSTRAINT IF EXISTS certificates_property_id_fkey;
ALTER TABLE IF EXISTS course_generation_jobs DROP CONSTRAINT IF EXISTS course_generation_jobs_property_id_fkey;
ALTER TABLE IF EXISTS course_generation_presets DROP CONSTRAINT IF EXISTS course_generation_presets_property_id_fkey;
ALTER TABLE IF EXISTS courses DROP CONSTRAINT IF EXISTS courses_property_id_fkey;
ALTER TABLE IF EXISTS departments DROP CONSTRAINT IF EXISTS departments_property_id_fkey;
ALTER TABLE IF EXISTS document_folders DROP CONSTRAINT IF EXISTS document_folders_property_id_fkey;
ALTER TABLE IF EXISTS documents DROP CONSTRAINT IF EXISTS documents_property_id_fkey;
ALTER TABLE IF EXISTS question_banks DROP CONSTRAINT IF EXISTS question_banks_property_id_fkey;
ALTER TABLE IF EXISTS report_definitions DROP CONSTRAINT IF EXISTS report_definitions_property_id_fkey;
ALTER TABLE IF EXISTS search_logs DROP CONSTRAINT IF EXISTS search_logs_property_id_fkey;
ALTER TABLE IF EXISTS training_modules DROP CONSTRAINT IF EXISTS training_modules_property_id_fkey;
ALTER TABLE IF EXISTS training_paths DROP CONSTRAINT IF EXISTS training_paths_target_property_id_fkey;
ALTER TABLE IF EXISTS user_invitations DROP CONSTRAINT IF EXISTS user_invitations_property_id_fkey;

DROP TABLE IF EXISTS user_properties CASCADE;
DROP TABLE IF EXISTS user_departments CASCADE;
DROP TABLE IF EXISTS crm_leads CASCADE;
DROP TABLE IF EXISTS crm_contracts CASCADE;
DROP TABLE IF EXISTS crm_accounts CASCADE;
DROP TABLE IF EXISTS employee_documents CASCADE;
DROP TABLE IF EXISTS employee_of_the_month CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS task_watchers CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS task_templates CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS properties CASCADE;

-- 9. Security Definer Helper Functions
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF uuid STABLE SECURITY DEFINER AS \$\$
  SELECT organization_id FROM public.organization_memberships
  WHERE user_id = auth.uid() AND is_active = true;
\$\$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.get_operator_impersonated_org()
RETURNS uuid STABLE SECURITY DEFINER AS \$\$
  SELECT target_organization_id FROM public.platform_access_sessions
  WHERE admin_user_id = auth.uid() 
    AND is_active = true 
    AND expires_at > now()
  LIMIT 1;
\$\$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_platform_user(target_user_id uuid)
RETURNS boolean STABLE SECURITY DEFINER AS \$\$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = target_user_id 
      AND role IN ('super_admin', 'corporate_admin', 'regional_admin')
  );
\$\$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.has_tenant_access(record_org_id uuid)
RETURNS boolean STABLE SECURITY DEFINER AS \$\$
  SELECT (
    (record_org_id IS NOT NULL AND record_org_id IN (SELECT public.get_user_organizations()))
    OR (record_org_id IS NOT NULL AND record_org_id = public.get_operator_impersonated_org())
    OR (public.is_platform_user(auth.uid()))
  );
\$\$ LANGUAGE sql;
