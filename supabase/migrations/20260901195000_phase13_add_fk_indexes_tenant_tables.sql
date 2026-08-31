-- Phase 13 (perf): every multi-tenant RLS policy filters on organization_id (and often
-- user_id / a parent FK). None of those columns were indexed. Add covering btree indexes
-- for the FK columns on the tenant + learning-domain tables. Idempotent.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass::text AS tbl, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.connamespace = 'public'::regnamespace
      AND array_length(c.conkey, 1) = 1
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND (c.conkey::int[])[1] = (i.indkey::int[])[1]
      )
      AND (
        a.attname IN ('organization_id','hotel_id','brand_id','user_id','created_by',
                      'assigned_by','reviewed_by','issued_by','revoked_by','deployed_by',
                      'admin_user_id','target_organization_id','owner_id','updated_by')
        OR c.conrelid::regclass::text IN (
          'courses','course_modules','lessons','lesson_blocks','enrollments','lesson_progress',
          'learning_events','assessments','assessment_questions','learning_quizzes',
          'training_progress','training_assignment_rules','training_assignment_submissions',
          'certificates','certificate_templates','knowledge_chunks','organization_memberships',
          'platform_access_sessions','master_content_deployments','announcements','question_banks',
          'training_paths','training_modules','documents','unified_questions',
          'unified_quiz_sessions','unified_question_attempts','brands','hotels','departments',
          'properties','subscriptions')
      )
  LOOP
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
      'idx_' || replace(r.tbl, 'public.', '') || '_' || r.col,
      replace(r.tbl, 'public.', ''),
      r.col
    );
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_training_progress_user_org ON public.training_progress (user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_org_status ON public.training_modules (organization_id, status) WHERE COALESCE(is_deleted,false) = false;
CREATE INDEX IF NOT EXISTS idx_documents_org_status ON public.documents (organization_id, status) WHERE COALESCE(is_deleted,false) = false;
CREATE INDEX IF NOT EXISTS idx_unified_questions_org_status ON public.unified_questions (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_active ON public.organization_memberships (user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_platform_access_sessions_admin_active ON public.platform_access_sessions (admin_user_id, target_organization_id) WHERE is_active = true;
