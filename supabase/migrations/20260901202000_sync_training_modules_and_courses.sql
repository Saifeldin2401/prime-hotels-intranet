-- Migration: 20260901202000_sync_training_modules_and_courses.sql
-- Description: Continuous synchronization trigger from training_modules to courses

CREATE OR REPLACE FUNCTION public.sync_training_module_to_course()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.courses (
    id,
    title,
    description,
    status,
    difficulty_level,
    estimated_duration_minutes,
    passing_score_percentage,
    certificate_enabled,
    allow_retake,
    max_attempts,
    department_id,
    blueprint,
    quality_score,
    source_training_module_id,
    created_by,
    created_at,
    updated_at,
    is_deleted,
    organization_id,
    scope_type,
    is_master_template
  ) VALUES (
    NEW.id,
    NEW.title,
    NEW.description,
    NEW.status,
    COALESCE(NEW.difficulty_level, 'intermediate'),
    COALESCE(NEW.estimated_duration_minutes, 30),
    COALESCE(NEW.passing_score_percentage, 80),
    COALESCE(NEW.certificate_enabled, true),
    true,
    3,
    NEW.department_id,
    NEW.blueprint,
    COALESCE(NEW.quality_score, 90),
    NEW.id,
    NEW.created_by,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now()),
    COALESCE(NEW.is_deleted, false),
    COALESCE(NEW.organization_id, 'e0000000-0000-0000-0000-000000000001'::uuid),
    'organization',
    COALESCE(NEW.is_master_template, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    difficulty_level = EXCLUDED.difficulty_level,
    estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
    passing_score_percentage = EXCLUDED.passing_score_percentage,
    certificate_enabled = EXCLUDED.certificate_enabled,
    department_id = EXCLUDED.department_id,
    blueprint = EXCLUDED.blueprint,
    quality_score = EXCLUDED.quality_score,
    updated_at = EXCLUDED.updated_at,
    is_deleted = EXCLUDED.is_deleted,
    organization_id = EXCLUDED.organization_id,
    is_master_template = EXCLUDED.is_master_template;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS trg_sync_training_module_to_course ON public.training_modules;
CREATE TRIGGER trg_sync_training_module_to_course
AFTER INSERT OR UPDATE ON public.training_modules
FOR EACH ROW EXECUTE FUNCTION public.sync_training_module_to_course();
