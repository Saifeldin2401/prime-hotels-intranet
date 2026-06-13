-- Prevent module assignments from targeting deleted/unpublished modules.
-- Also repair existing active assignments that still reference deleted module versions.

WITH deleted_assigned AS (
  SELECT
    la.id AS assignment_id,
    la.target_type,
    COALESCE(la.target_id, '__everyone__') AS target_scope,
    la.content_type,
    tm_old.title AS old_title
  FROM public.learning_assignments la
  JOIN public.training_modules tm_old
    ON tm_old.id = la.content_id
  WHERE la.content_type = 'module'
    AND COALESCE(la.is_deleted, false) = false
    AND COALESCE(tm_old.is_deleted, false) = true
),
candidate_targets AS (
  SELECT
    da.assignment_id,
    tm_new.id AS new_module_id,
    ROW_NUMBER() OVER (
      PARTITION BY da.assignment_id
      ORDER BY tm_new.updated_at DESC NULLS LAST, tm_new.created_at DESC
    ) AS rn
  FROM deleted_assigned da
  JOIN public.training_modules tm_new
    ON lower(trim(tm_new.title)) = lower(trim(da.old_title))
   AND COALESCE(tm_new.is_deleted, false) = false
   AND COALESCE(tm_new.is_active, false) = true
   AND tm_new.status = 'published'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.learning_assignments la2
    WHERE la2.content_type = da.content_type
      AND COALESCE(la2.is_deleted, false) = false
      AND la2.target_type = da.target_type
      AND COALESCE(la2.target_id, '__everyone__') = da.target_scope
      AND la2.content_id = tm_new.id
  )
),
chosen AS (
  SELECT assignment_id, new_module_id
  FROM candidate_targets
  WHERE rn = 1
)
UPDATE public.learning_assignments la
SET content_id = chosen.new_module_id
FROM chosen
WHERE la.id = chosen.assignment_id;

CREATE OR REPLACE FUNCTION public.validate_learning_assignment_target_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  module_row RECORD;
BEGIN
  IF COALESCE(NEW.is_deleted, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.content_type = 'module' THEN
    SELECT
      tm.id,
      tm.status,
      COALESCE(tm.is_active, false) AS is_active,
      COALESCE(tm.is_deleted, false) AS is_deleted
    INTO module_row
    FROM public.training_modules tm
    WHERE tm.id = NEW.content_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot assign module %. Module not found.', NEW.content_id
        USING ERRCODE = '23503';
    END IF;

    IF module_row.is_deleted THEN
      RAISE EXCEPTION 'Cannot assign module %. Module is deleted.', NEW.content_id
        USING ERRCODE = '23514';
    END IF;

    IF NOT module_row.is_active THEN
      RAISE EXCEPTION 'Cannot assign module %. Module is inactive.', NEW.content_id
        USING ERRCODE = '23514';
    END IF;

    IF module_row.status <> 'published' THEN
      RAISE EXCEPTION 'Cannot assign module %. Module status must be published.', NEW.content_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_learning_assignment_target_content
  ON public.learning_assignments;

CREATE TRIGGER trg_validate_learning_assignment_target_content
BEFORE INSERT OR UPDATE OF content_type, content_id, is_deleted
ON public.learning_assignments
FOR EACH ROW
EXECUTE FUNCTION public.validate_learning_assignment_target_content();;
