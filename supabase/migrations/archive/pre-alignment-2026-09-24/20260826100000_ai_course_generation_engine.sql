-- =============================================================================
-- Migration: 20260826100000_ai_course_generation_engine.sql
-- Purpose: Schema extensions for production AI Course Generation Engine & LCMS
-- =============================================================================

-- 1. Extend question_type enum with expanded question formats
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'yes_no';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'short_answer';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'long_answer';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'ranking';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'case_based';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'numeric';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'code_technical';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'categorization';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'hotspot_image';

-- 2. Create question_banks table
CREATE TABLE IF NOT EXISTS public.question_banks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    name_ar         text,
    description     text,
    property_id     uuid REFERENCES public.properties(id) ON DELETE CASCADE,
    department_id   uuid REFERENCES public.departments(id) ON DELETE SET NULL,
    tags            text[] DEFAULT '{}',
    is_active       boolean NOT NULL DEFAULT true,
    created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_banks_property ON public.question_banks(property_id);
CREATE INDEX IF NOT EXISTS idx_question_banks_dept ON public.question_banks(department_id);

ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY question_banks_select ON public.question_banks
FOR SELECT TO authenticated
USING (
    property_id IS NULL 
    OR property_id = (SELECT property_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin'])
    )
);

CREATE POLICY question_banks_insert ON public.question_banks
FOR INSERT TO authenticated
WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','property_manager','department_head'])
    )
);

CREATE POLICY question_banks_update ON public.question_banks
FOR UPDATE TO authenticated
USING (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','property_manager','department_head'])
    )
);

-- 3. Create course_generation_presets table
CREATE TABLE IF NOT EXISTS public.course_generation_presets (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    name_ar         text,
    description     text,
    description_ar  text,
    is_system       boolean NOT NULL DEFAULT false,
    preset_config   jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    property_id     uuid REFERENCES public.properties(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_generation_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_generation_presets_select ON public.course_generation_presets
FOR SELECT TO authenticated
USING (true);

CREATE POLICY course_generation_presets_manage ON public.course_generation_presets
FOR ALL TO authenticated
USING (
    (created_by = auth.uid() AND is_system = false)
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])
    )
);

-- 4. Create course_generation_jobs table (History & Audit)
CREATE TABLE IF NOT EXISTS public.course_generation_jobs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mode            text NOT NULL,
    course_id       uuid REFERENCES public.training_modules(id) ON DELETE SET NULL,
    status          text NOT NULL DEFAULT 'completed',
    config          jsonb NOT NULL DEFAULT '{}'::jsonb,
    blueprint       jsonb,
    qa_report       jsonb,
    models_used     text[] DEFAULT '{}',
    duration_ms     integer,
    error_message   text,
    property_id     uuid REFERENCES public.properties(id) ON DELETE CASCADE,
    created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_gen_jobs_course ON public.course_generation_jobs(course_id);
CREATE INDEX IF NOT EXISTS idx_course_gen_jobs_creator ON public.course_generation_jobs(created_by, created_at DESC);

ALTER TABLE public.course_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_generation_jobs_select ON public.course_generation_jobs
FOR SELECT TO authenticated
USING (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','property_manager','department_head'])
    )
);

CREATE POLICY course_generation_jobs_insert ON public.course_generation_jobs
FOR INSERT TO authenticated
WITH CHECK (
    created_by = auth.uid()
);

-- 5. Extend training_modules with LCMS and AI generation columns
ALTER TABLE public.training_modules
    ADD COLUMN IF NOT EXISTS course_type text,
    ADD COLUMN IF NOT EXISTS instructional_strategy text,
    ADD COLUMN IF NOT EXISTS target_audience text,
    ADD COLUMN IF NOT EXISTS experience_level text,
    ADD COLUMN IF NOT EXISTS prior_knowledge text,
    ADD COLUMN IF NOT EXISTS generation_mode text,
    ADD COLUMN IF NOT EXISTS generation_job_id uuid REFERENCES public.course_generation_jobs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS blueprint jsonb,
    ADD COLUMN IF NOT EXISTS quality_score integer,
    ADD COLUMN IF NOT EXISTS qa_report jsonb;

-- 6. Extend unified_questions with cognitive & question bank columns
ALTER TABLE public.unified_questions
    ADD COLUMN IF NOT EXISTS bloom_level text,
    ADD COLUMN IF NOT EXISTS cognitive_domain text,
    ADD COLUMN IF NOT EXISTS question_bank_id uuid REFERENCES public.question_banks(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS distractor_rationales jsonb,
    ADD COLUMN IF NOT EXISTS rubric jsonb;

CREATE INDEX IF NOT EXISTS idx_unified_questions_bank ON public.unified_questions(question_bank_id);
CREATE INDEX IF NOT EXISTS idx_unified_questions_bloom ON public.unified_questions(bloom_level);

-- 7. Seed standard AI Course Presets
INSERT INTO public.course_generation_presets (name, name_ar, description, description_ar, is_system, preset_config)
VALUES
(
    '5-Star Luxury Standard SOP',
    'معيار التشغيل القياسي للضيافة الفاخرة 5 نجوم',
    'Comprehensive luxury hotel SOPs with Forbes standards, guest dialogue scripts, quality checklists, and scenario dilemmas.',
    'إجراءات تشغيل قياسية فاخرة مع معايير فوربس، نصوص حوارية مع الضيوف، قوائم تدقيق الجودة وسيناريوهات معالجة المشكلات.',
    true,
    '{
        "generationMode": "full_course",
        "courseType": "professional",
        "instructionalStrategy": "explain_example_practice",
        "targetAudience": "employees",
        "experienceLevel": "intermediate",
        "difficulty": "intermediate",
        "difficultyProgression": "progressive",
        "moduleCount": 4,
        "lessonsPerModule": 3,
        "lessonDuration": 15,
        "contentDepth": "comprehensive",
        "depthConfig": { "theory": 3, "examples": 4, "practical": 4, "caseStudies": 4, "assessments": 3 },
        "lessonComponents": ["intro", "objectives", "concepts", "explanation", "examples", "step_procedure", "dialogue_script", "checklist", "scenario", "summary", "knowledge_check"],
        "quizConfig": { "placement": "per_module", "questionCount": 5, "passingScore": 85, "maxAttempts": 3, "distractorQuality": "high" },
        "questionTypes": ["mcq", "scenario", "ordering", "matching"],
        "bloomDistribution": { "remember": 20, "understand": 30, "apply": 30, "analyze": 20, "evaluate": 0, "create": 0 }
    }'::jsonb
),
(
    'KSA Compliance & Safety Certification',
    'شهادة الامتثال والسلامة المهنية (المملكة العربية السعودية)',
    'Strict regulatory adherence to Saudi Labor, Civil Defense, and Municipal hygiene standards with zero-defect rules and rigorous checkpoints.',
    'التزام صارم بأنظمة العمل والدفاع المدني وهيئة الغذاء والدواء مع اختبارات تحقق صارمة وقواعد عدم التسامح مع المخالفات.',
    true,
    '{
        "generationMode": "full_course",
        "courseType": "compliance",
        "instructionalStrategy": "traditional",
        "targetAudience": "employees",
        "experienceLevel": "beginner",
        "difficulty": "challenging",
        "difficultyProgression": "steep",
        "moduleCount": 4,
        "lessonsPerModule": 2,
        "lessonDuration": 20,
        "contentDepth": "detailed",
        "depthConfig": { "theory": 4, "examples": 3, "practical": 4, "caseStudies": 4, "assessments": 5 },
        "lessonComponents": ["intro", "objectives", "definitions", "explanation", "step_procedure", "checklist", "summary", "action_points", "assessment"],
        "quizConfig": { "placement": "per_lesson", "questionCount": 5, "passingScore": 90, "maxAttempts": 2, "distractorQuality": "high" },
        "questionTypes": ["mcq", "true_false", "ordering", "scenario", "fill_blank"],
        "bloomDistribution": { "remember": 30, "understand": 30, "apply": 30, "analyze": 10, "evaluate": 0, "create": 0 }
    }'::jsonb
),
(
    'Executive Leadership & Supervisory Coaching',
    'القيادة الإشرافية والتدريب الإداري الفندقي',
    'Advanced hospitality leadership covering shift supervision, root-cause resolution, associate coaching, and audit inspections.',
    'إدارة فندقية متقدمة تغطي الإشراف على الورديات، تحليل الأسباب الجذرية، توجيه الموظفين، وتدقيق الجودة.',
    true,
    '{
        "generationMode": "full_course",
        "courseType": "management",
        "instructionalStrategy": "case_based",
        "targetAudience": "managers",
        "experienceLevel": "advanced",
        "difficulty": "advanced",
        "difficultyProgression": "progressive",
        "moduleCount": 5,
        "lessonsPerModule": 3,
        "lessonDuration": 30,
        "contentDepth": "expert",
        "depthConfig": { "theory": 4, "examples": 5, "practical": 5, "caseStudies": 5, "assessments": 4 },
        "lessonComponents": ["intro", "objectives", "concepts", "explanation", "case_study", "scenario", "reflection_questions", "discussion_questions", "summary", "action_points"],
        "quizConfig": { "placement": "per_module", "questionCount": 6, "passingScore": 85, "maxAttempts": 3, "distractorQuality": "high" },
        "questionTypes": ["scenario", "case_based", "short_answer", "ranking", "mcq_multi"],
        "bloomDistribution": { "remember": 10, "understand": 20, "apply": 30, "analyze": 25, "evaluate": 15, "create": 0 }
    }'::jsonb
),
(
    'Microlearning 3-Minute Fast Track',
    'التعلم المصغر السريع (3 دقائق)',
    'High-impact bite-sized lessons designed for rapid shift-briefing training with quick reference tables and action cards.',
    'دروس سريعة مركزة مصممة للاجتماعات الافتتاحية للورديات مع بطاقات عمل مرئية وجداول مرجعية.',
    true,
    '{
        "generationMode": "full_course",
        "courseType": "microlearning",
        "instructionalStrategy": "microlearning",
        "targetAudience": "employees",
        "experienceLevel": "all_levels",
        "difficulty": "easy",
        "difficultyProgression": "flat",
        "moduleCount": 3,
        "lessonsPerModule": 2,
        "lessonDuration": 5,
        "contentDepth": "quick",
        "depthConfig": { "theory": 2, "examples": 3, "practical": 4, "caseStudies": 2, "assessments": 3 },
        "lessonComponents": ["objectives", "concepts", "step_procedure", "summary", "action_points", "knowledge_check"],
        "quizConfig": { "placement": "per_module", "questionCount": 3, "passingScore": 80, "maxAttempts": 3, "distractorQuality": "medium" },
        "questionTypes": ["mcq", "true_false", "fill_blank"],
        "bloomDistribution": { "remember": 40, "understand": 40, "apply": 20, "analyze": 0, "evaluate": 0, "create": 0 }
    }'::jsonb
)
ON CONFLICT DO NOTHING;
