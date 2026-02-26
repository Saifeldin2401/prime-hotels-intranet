-- Learning integrity, access hardening, and search performance safeguards.
-- Scope:
-- 1) Repair/guard assignment -> progress linkage
-- 2) Restore learning_progress -> training_progress backward sync
-- 3) Tighten overly broad RLS policies
-- 4) Improve Knowledge Base search index coverage

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Search extension + safer JSON defaults
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

UPDATE public.learning_progress
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

ALTER TABLE public.learning_progress
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL;

UPDATE public.training_content_blocks
SET content_data = '{}'::jsonb
WHERE content_data IS NULL;

ALTER TABLE public.training_content_blocks
  ALTER COLUMN content_data SET DEFAULT '{}'::jsonb,
  ALTER COLUMN content_data SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 1) Assignment integrity
-- ---------------------------------------------------------------------------

-- Soft-delete dangling module assignments (content no longer exists).
UPDATE public.learning_assignments a
SET
  is_deleted = true
WHERE
  COALESCE(a.is_deleted, false) = false
  AND a.content_type = 'module'
  AND NOT EXISTS (
    SELECT 1
    FROM public.training_modules tm
    WHERE tm.id = a.content_id
      AND COALESCE(tm.is_deleted, false) = false
  );

-- Deduplicate active assignments on canonical target + content dimensions.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY target_type, COALESCE(target_id, '__everyone__'), content_type, content_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.learning_assignments
  WHERE COALESCE(is_deleted, false) = false
)
UPDATE public.learning_assignments a
SET
  is_deleted = true
FROM ranked r
WHERE a.id = r.id
  AND r.rn > 1;

-- Replace weak uniqueness (NULL target_id allowed duplicate "everyone" rows).
DROP INDEX IF EXISTS public.learning_assignments_target_content_unique;

CREATE UNIQUE INDEX IF NOT EXISTS learning_assignments_unique_active_target
ON public.learning_assignments (
  target_type,
  COALESCE(target_id, '__everyone__'),
  content_type,
  content_id
)
WHERE COALESCE(is_deleted, false) = false;

-- Guard target_id semantics by target_type.
ALTER TABLE public.learning_assignments
  DROP CONSTRAINT IF EXISTS learning_assignments_target_id_required_chk;

ALTER TABLE public.learning_assignments
  ADD CONSTRAINT learning_assignments_target_id_required_chk
  CHECK (
    (target_type = 'everyone' AND target_id IS NULL)
    OR
    (target_type IN ('user', 'department', 'role', 'property') AND target_id IS NOT NULL AND LENGTH(TRIM(target_id)) > 0)
  );

-- ---------------------------------------------------------------------------
-- 2) Ensure assignment creates/refreshes user learning_progress
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_assignment_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uuid_regex CONSTANT text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
BEGIN
  IF COALESCE(NEW.is_deleted, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.content_type <> 'module' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.training_modules tm
    WHERE tm.id = NEW.content_id
      AND COALESCE(tm.is_deleted, false) = false
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.target_type = 'everyone' THEN
    INSERT INTO public.learning_progress (
      assignment_id,
      user_id,
      content_type,
      content_id,
      status,
      progress_percentage,
      last_accessed_at,
      last_activity_at,
      is_deleted,
      metadata
    )
    SELECT
      NEW.id,
      p.id,
      'module'::public.learning_content_type,
      NEW.content_id,
      'assigned'::public.learning_assignment_status,
      0,
      NOW(),
      NOW(),
      false,
      '{}'::jsonb
    FROM public.profiles p
    WHERE p.is_active = true
      AND COALESCE(p.is_deleted, false) = false
    ON CONFLICT (user_id, content_type, content_id)
    DO UPDATE SET
      assignment_id = EXCLUDED.assignment_id,
      status = CASE
        WHEN public.learning_progress.status = 'completed'::public.learning_assignment_status
          THEN public.learning_progress.status
        ELSE 'assigned'::public.learning_assignment_status
      END,
      last_accessed_at = NOW(),
      last_activity_at = NOW(),
      is_deleted = false,
      metadata = COALESCE(public.learning_progress.metadata, '{}'::jsonb),
      updated_at = NOW();

    RETURN NEW;
  END IF;

  IF NEW.target_type = 'user'
     AND NEW.target_id ~* uuid_regex THEN
    INSERT INTO public.learning_progress (
      assignment_id,
      user_id,
      content_type,
      content_id,
      status,
      progress_percentage,
      last_accessed_at,
      last_activity_at,
      is_deleted,
      metadata
    )
    SELECT
      NEW.id,
      p.id,
      'module'::public.learning_content_type,
      NEW.content_id,
      'assigned'::public.learning_assignment_status,
      0,
      NOW(),
      NOW(),
      false,
      '{}'::jsonb
    FROM public.profiles p
    WHERE p.id = NEW.target_id::uuid
      AND p.is_active = true
      AND COALESCE(p.is_deleted, false) = false
    ON CONFLICT (user_id, content_type, content_id)
    DO UPDATE SET
      assignment_id = EXCLUDED.assignment_id,
      status = CASE
        WHEN public.learning_progress.status = 'completed'::public.learning_assignment_status
          THEN public.learning_progress.status
        ELSE 'assigned'::public.learning_assignment_status
      END,
      last_accessed_at = NOW(),
      last_activity_at = NOW(),
      is_deleted = false,
      metadata = COALESCE(public.learning_progress.metadata, '{}'::jsonb),
      updated_at = NOW();

    RETURN NEW;
  END IF;

  IF NEW.target_type = 'department'
     AND NEW.target_id ~* uuid_regex THEN
    INSERT INTO public.learning_progress (
      assignment_id,
      user_id,
      content_type,
      content_id,
      status,
      progress_percentage,
      last_accessed_at,
      last_activity_at,
      is_deleted,
      metadata
    )
    SELECT
      NEW.id,
      ud.user_id,
      'module'::public.learning_content_type,
      NEW.content_id,
      'assigned'::public.learning_assignment_status,
      0,
      NOW(),
      NOW(),
      false,
      '{}'::jsonb
    FROM public.user_departments ud
    JOIN public.profiles p ON p.id = ud.user_id
    WHERE ud.department_id = NEW.target_id::uuid
      AND p.is_active = true
      AND COALESCE(p.is_deleted, false) = false
    ON CONFLICT (user_id, content_type, content_id)
    DO UPDATE SET
      assignment_id = EXCLUDED.assignment_id,
      status = CASE
        WHEN public.learning_progress.status = 'completed'::public.learning_assignment_status
          THEN public.learning_progress.status
        ELSE 'assigned'::public.learning_assignment_status
      END,
      last_accessed_at = NOW(),
      last_activity_at = NOW(),
      is_deleted = false,
      metadata = COALESCE(public.learning_progress.metadata, '{}'::jsonb),
      updated_at = NOW();

    RETURN NEW;
  END IF;

  IF NEW.target_type = 'property'
     AND NEW.target_id ~* uuid_regex THEN
    INSERT INTO public.learning_progress (
      assignment_id,
      user_id,
      content_type,
      content_id,
      status,
      progress_percentage,
      last_accessed_at,
      last_activity_at,
      is_deleted,
      metadata
    )
    SELECT
      NEW.id,
      up.user_id,
      'module'::public.learning_content_type,
      NEW.content_id,
      'assigned'::public.learning_assignment_status,
      0,
      NOW(),
      NOW(),
      false,
      '{}'::jsonb
    FROM public.user_properties up
    JOIN public.profiles p ON p.id = up.user_id
    WHERE up.property_id = NEW.target_id::uuid
      AND p.is_active = true
      AND COALESCE(p.is_deleted, false) = false
    ON CONFLICT (user_id, content_type, content_id)
    DO UPDATE SET
      assignment_id = EXCLUDED.assignment_id,
      status = CASE
        WHEN public.learning_progress.status = 'completed'::public.learning_assignment_status
          THEN public.learning_progress.status
        ELSE 'assigned'::public.learning_assignment_status
      END,
      last_accessed_at = NOW(),
      last_activity_at = NOW(),
      is_deleted = false,
      metadata = COALESCE(public.learning_progress.metadata, '{}'::jsonb),
      updated_at = NOW();

    RETURN NEW;
  END IF;

  IF NEW.target_type = 'role' THEN
    INSERT INTO public.learning_progress (
      assignment_id,
      user_id,
      content_type,
      content_id,
      status,
      progress_percentage,
      last_accessed_at,
      last_activity_at,
      is_deleted,
      metadata
    )
    SELECT
      NEW.id,
      ur.user_id,
      'module'::public.learning_content_type,
      NEW.content_id,
      'assigned'::public.learning_assignment_status,
      0,
      NOW(),
      NOW(),
      false,
      '{}'::jsonb
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role::text = NEW.target_id
      AND p.is_active = true
      AND COALESCE(p.is_deleted, false) = false
    ON CONFLICT (user_id, content_type, content_id)
    DO UPDATE SET
      assignment_id = EXCLUDED.assignment_id,
      status = CASE
        WHEN public.learning_progress.status = 'completed'::public.learning_assignment_status
          THEN public.learning_progress.status
        ELSE 'assigned'::public.learning_assignment_status
      END,
      last_accessed_at = NOW(),
      last_activity_at = NOW(),
      is_deleted = false,
      metadata = COALESCE(public.learning_progress.metadata, '{}'::jsonb),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_assignment_progress ON public.learning_assignments;

CREATE TRIGGER trg_generate_assignment_progress
AFTER INSERT OR UPDATE OF target_type, target_id, content_type, content_id, is_deleted, status
ON public.learning_assignments
FOR EACH ROW
WHEN (COALESCE(NEW.is_deleted, false) = false)
EXECUTE FUNCTION public.generate_assignment_progress();

-- Backfill learning_progress rows for all current active module assignments.
WITH active_assignments AS (
  SELECT
    a.id AS assignment_id,
    a.target_type,
    a.target_id,
    a.content_id,
    a.created_at
  FROM public.learning_assignments a
  WHERE COALESCE(a.is_deleted, false) = false
    AND a.content_type = 'module'
    AND EXISTS (
      SELECT 1
      FROM public.training_modules tm
      WHERE tm.id = a.content_id
        AND COALESCE(tm.is_deleted, false) = false
    )
),
targets AS (
  SELECT
    a.assignment_id,
    p.id AS user_id,
    a.content_id,
    a.created_at
  FROM active_assignments a
  JOIN public.profiles p ON a.target_type = 'everyone'
  WHERE p.is_active = true
    AND COALESCE(p.is_deleted, false) = false

  UNION ALL

  SELECT
    a.assignment_id,
    p.id AS user_id,
    a.content_id,
    a.created_at
  FROM active_assignments a
  JOIN public.profiles p
    ON a.target_type = 'user'
   AND a.target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   AND p.id = a.target_id::uuid
  WHERE p.is_active = true
    AND COALESCE(p.is_deleted, false) = false

  UNION ALL

  SELECT
    a.assignment_id,
    ud.user_id,
    a.content_id,
    a.created_at
  FROM active_assignments a
  JOIN public.user_departments ud
    ON a.target_type = 'department'
   AND a.target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   AND ud.department_id = a.target_id::uuid
  JOIN public.profiles p ON p.id = ud.user_id
  WHERE p.is_active = true
    AND COALESCE(p.is_deleted, false) = false

  UNION ALL

  SELECT
    a.assignment_id,
    up.user_id,
    a.content_id,
    a.created_at
  FROM active_assignments a
  JOIN public.user_properties up
    ON a.target_type = 'property'
   AND a.target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   AND up.property_id = a.target_id::uuid
  JOIN public.profiles p ON p.id = up.user_id
  WHERE p.is_active = true
    AND COALESCE(p.is_deleted, false) = false

  UNION ALL

  SELECT
    a.assignment_id,
    ur.user_id,
    a.content_id,
    a.created_at
  FROM active_assignments a
  JOIN public.user_roles ur
    ON a.target_type = 'role'
   AND ur.role::text = a.target_id
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE p.is_active = true
    AND COALESCE(p.is_deleted, false) = false
),
ranked_targets AS (
  SELECT
    assignment_id,
    user_id,
    content_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, content_id
      ORDER BY created_at DESC, assignment_id DESC
    ) AS rn
  FROM targets
)
INSERT INTO public.learning_progress (
  assignment_id,
  user_id,
  content_type,
  content_id,
  status,
  progress_percentage,
  last_accessed_at,
  last_activity_at,
  is_deleted,
  metadata
)
SELECT
  rt.assignment_id,
  rt.user_id,
  'module'::public.learning_content_type,
  rt.content_id,
  'assigned'::public.learning_assignment_status,
  0,
  NOW(),
  NOW(),
  false,
  '{}'::jsonb
FROM ranked_targets rt
WHERE rt.rn = 1
ON CONFLICT (user_id, content_type, content_id)
DO UPDATE SET
  assignment_id = EXCLUDED.assignment_id,
  status = CASE
    WHEN public.learning_progress.status = 'completed'::public.learning_assignment_status
      THEN public.learning_progress.status
    ELSE 'assigned'::public.learning_assignment_status
  END,
  last_accessed_at = NOW(),
  last_activity_at = NOW(),
  is_deleted = false,
  metadata = COALESCE(public.learning_progress.metadata, '{}'::jsonb),
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- 3) Keep legacy training_progress in sync for dashboard/report compatibility
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_learning_to_training_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mapped_status public.training_status;
  mapped_started_at timestamptz;
BEGIN
  IF NEW.content_type <> 'module' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.training_modules tm
    WHERE tm.id = NEW.content_id
  ) THEN
    RETURN NEW;
  END IF;

  mapped_status := CASE NEW.status
    WHEN 'completed' THEN 'completed'::public.training_status
    WHEN 'in_progress' THEN 'in_progress'::public.training_status
    WHEN 'overdue' THEN 'expired'::public.training_status
    ELSE 'not_started'::public.training_status
  END;

  mapped_started_at := CASE
    WHEN NEW.status IN ('in_progress', 'completed', 'overdue')
      THEN COALESCE(NEW.last_accessed_at, NEW.created_at, NOW())
    ELSE NULL
  END;

  INSERT INTO public.training_progress (
    user_id,
    training_id,
    assignment_id,
    status,
    started_at,
    completed_at,
    quiz_score,
    updated_at,
    is_deleted
  )
  VALUES (
    NEW.user_id,
    NEW.content_id,
    NEW.assignment_id,
    mapped_status,
    mapped_started_at,
    NEW.completed_at,
    CASE WHEN NEW.score_percentage IS NULL THEN NULL ELSE ROUND(NEW.score_percentage)::int END,
    NOW(),
    COALESCE(NEW.is_deleted, false)
  )
  ON CONFLICT (user_id, training_id)
  DO UPDATE SET
    assignment_id = EXCLUDED.assignment_id,
    status = EXCLUDED.status,
    started_at = COALESCE(public.training_progress.started_at, EXCLUDED.started_at),
    completed_at = EXCLUDED.completed_at,
    quiz_score = EXCLUDED.quiz_score,
    is_deleted = EXCLUDED.is_deleted,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_learning_to_training_progress_sync ON public.learning_progress;
DROP TRIGGER IF EXISTS trg_sync_learning_to_training_progress ON public.learning_progress;

CREATE TRIGGER trg_sync_learning_to_training_progress
AFTER INSERT OR UPDATE OF assignment_id, content_type, content_id, status, score_percentage, completed_at, is_deleted
ON public.learning_progress
FOR EACH ROW
EXECUTE FUNCTION public.sync_learning_to_training_progress();

-- Backfill legacy training_progress rows from current learning_progress.
INSERT INTO public.training_progress (
  user_id,
  training_id,
  assignment_id,
  status,
  started_at,
  completed_at,
  quiz_score,
  updated_at,
  is_deleted
)
SELECT
  lp.user_id,
  lp.content_id AS training_id,
  lp.assignment_id,
  CASE lp.status
    WHEN 'completed' THEN 'completed'::public.training_status
    WHEN 'in_progress' THEN 'in_progress'::public.training_status
    WHEN 'overdue' THEN 'expired'::public.training_status
    ELSE 'not_started'::public.training_status
  END AS status,
  CASE
    WHEN lp.status IN ('in_progress', 'completed', 'overdue')
      THEN COALESCE(lp.last_accessed_at, lp.created_at, NOW())
    ELSE NULL
  END AS started_at,
  lp.completed_at,
  CASE WHEN lp.score_percentage IS NULL THEN NULL ELSE ROUND(lp.score_percentage)::int END AS quiz_score,
  NOW() AS updated_at,
  COALESCE(lp.is_deleted, false) AS is_deleted
FROM public.learning_progress lp
WHERE lp.content_type = 'module'
  AND EXISTS (
    SELECT 1
    FROM public.training_modules tm
    WHERE tm.id = lp.content_id
  )
ON CONFLICT (user_id, training_id)
DO UPDATE SET
  assignment_id = EXCLUDED.assignment_id,
  status = EXCLUDED.status,
  started_at = COALESCE(public.training_progress.started_at, EXCLUDED.started_at),
  completed_at = EXCLUDED.completed_at,
  quiz_score = EXCLUDED.quiz_score,
  is_deleted = EXCLUDED.is_deleted,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- 4) RLS hardening for key content tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS training_progress_select ON public.training_progress;
CREATE POLICY training_progress_select
ON public.training_progress
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.has_any_role((SELECT auth.uid()), ARRAY['corporate_admin','regional_admin','regional_hr']::public.app_role[])
  OR (
    public.has_any_role((SELECT auth.uid()), ARRAY['property_manager','property_hr','department_head']::public.app_role[])
    AND EXISTS (
      SELECT 1
      FROM public.training_modules tm
      JOIN public.user_properties up
        ON up.user_id = (SELECT auth.uid())
       AND up.property_id = tm.property_id
      WHERE tm.id = public.training_progress.training_id
    )
  )
);

DROP POLICY IF EXISTS training_content_blocks_select ON public.training_content_blocks;
CREATE POLICY training_content_blocks_select
ON public.training_content_blocks
FOR SELECT
TO authenticated
USING (
  training_module_id IN (
    SELECT tm.id
    FROM public.training_modules tm
    WHERE COALESCE(tm.is_deleted, false) = false
  )
);

DROP POLICY IF EXISTS training_module_resources_select ON public.training_module_resources;
CREATE POLICY training_module_resources_select
ON public.training_module_resources
FOR SELECT
TO authenticated
USING (
  training_module_id IN (
    SELECT tm.id
    FROM public.training_modules tm
    WHERE COALESCE(tm.is_deleted, false) = false
  )
);

DROP POLICY IF EXISTS document_versions_select ON public.document_versions;
CREATE POLICY document_versions_select
ON public.document_versions
FOR SELECT
TO authenticated
USING (
  document_id IN (
    SELECT d.id
    FROM public.documents d
    WHERE COALESCE(d.is_deleted, false) = false
  )
);

DROP POLICY IF EXISTS training_certificates_select ON public.training_certificates;
CREATE POLICY training_certificates_select
ON public.training_certificates
FOR SELECT
TO authenticated
USING (
  training_progress_id IN (
    SELECT tp.id
    FROM public.training_progress tp
  )
);

-- ---------------------------------------------------------------------------
-- 5) Knowledge search performance indexes (ILIKE patterns)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_documents_title_trgm
  ON public.documents USING gin (title extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_documents_description_trgm
  ON public.documents USING gin (description extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_documents_content_trgm
  ON public.documents USING gin (content extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_knowledge_questions_text_trgm
  ON public.knowledge_questions USING gin (question_text extensions.gin_trgm_ops);

COMMIT;

NOTIFY pgrst, 'reload schema';;
