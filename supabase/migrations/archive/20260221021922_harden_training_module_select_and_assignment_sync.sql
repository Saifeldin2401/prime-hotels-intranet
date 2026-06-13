-- Harden learner-facing module visibility and keep assignments synced to active module versions.

-- 1) Restrict learner module visibility to active, published, non-deleted modules.
DROP POLICY IF EXISTS training_modules_select_policy ON public.training_modules;
CREATE POLICY training_modules_select_policy
ON public.training_modules
FOR SELECT
TO authenticated
USING (
  has_role_optimized('corporate_admin'::app_role)
  OR has_role_optimized('regional_admin'::app_role)
  OR has_role_optimized('regional_hr'::app_role)
  OR has_role_optimized('property_manager'::app_role)
  OR (
    COALESCE(training_modules.is_deleted, false) = false
    AND COALESCE(training_modules.is_active, false) = true
    AND training_modules.status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.learning_assignments la
      WHERE la.content_id = training_modules.id
        AND COALESCE(la.is_deleted, false) = false
        AND (
          (la.target_type = 'user'::learning_target_type AND la.target_id = (SELECT auth.uid())::text)
          OR la.target_type = 'everyone'::learning_target_type
          OR (la.target_type = 'department'::learning_target_type AND la.target_id = ANY((get_user_departments(auth.uid()))::text[]))
          OR (la.target_type = 'property'::learning_target_type AND la.target_id = ANY((get_user_properties(auth.uid()))::text[]))
          OR (la.target_type = 'role'::learning_target_type AND la.target_id = ANY((get_my_roles())::text[]))
        )
    )
  )
);

-- 2) Canonicalize module assignment targets before insert/update.
CREATE OR REPLACE FUNCTION public.validate_learning_assignment_target_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  module_row RECORD;
  v_resolved_module_id uuid;
BEGIN
  IF COALESCE(NEW.is_deleted, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.content_type = 'module' THEN
    IF NEW.content_id IS NULL THEN
      RAISE EXCEPTION 'Cannot assign module. Module id is required.'
        USING ERRCODE = '23514';
    END IF;

    v_resolved_module_id := public.resolve_training_module_write_target(NEW.content_id);

    IF v_resolved_module_id IS NULL THEN
      RAISE EXCEPTION 'Cannot assign module %. No active replacement found.', NEW.content_id
        USING ERRCODE = '23514';
    END IF;

    NEW.content_id := v_resolved_module_id;

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
EXECUTE FUNCTION public.validate_learning_assignment_target_content();

-- 3) When a module becomes invalid, remap or retire live assignments.
CREATE OR REPLACE FUNCTION public.sync_learning_assignments_after_module_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_replacement uuid;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(OLD.is_deleted, false) = COALESCE(NEW.is_deleted, false)
     AND COALESCE(OLD.is_active, true) = COALESCE(NEW.is_active, true)
     AND COALESCE(OLD.status, '') = COALESCE(NEW.status, '')
     AND COALESCE(OLD.title, '') = COALESCE(NEW.title, '')
     AND OLD.property_id IS NOT DISTINCT FROM NEW.property_id
     AND OLD.department_id IS NOT DISTINCT FROM NEW.department_id THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_deleted, false) = false
     AND COALESCE(NEW.is_active, true) = true
     AND COALESCE(NEW.status, 'draft') = 'published' THEN
    RETURN NEW;
  END IF;

  v_replacement := public.resolve_training_module_write_target(NEW.id);

  IF v_replacement IS NOT NULL AND v_replacement <> NEW.id THEN
    UPDATE public.learning_assignments la
    SET is_deleted = true
    WHERE la.content_type = 'module'
      AND COALESCE(la.is_deleted, false) = false
      AND la.content_id = NEW.id
      AND EXISTS (
        SELECT 1
        FROM public.learning_assignments la2
        WHERE la2.content_type = 'module'
          AND COALESCE(la2.is_deleted, false) = false
          AND la2.content_id = v_replacement
          AND la2.target_type = la.target_type
          AND COALESCE(la2.target_id, '__everyone__') = COALESCE(la.target_id, '__everyone__')
      );

    UPDATE public.learning_assignments la
    SET content_id = v_replacement
    WHERE la.content_type = 'module'
      AND COALESCE(la.is_deleted, false) = false
      AND la.content_id = NEW.id;
  ELSE
    UPDATE public.learning_assignments la
    SET is_deleted = true
    WHERE la.content_type = 'module'
      AND COALESCE(la.is_deleted, false) = false
      AND la.content_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_learning_assignments_after_module_change
  ON public.training_modules;

CREATE TRIGGER trg_sync_learning_assignments_after_module_change
AFTER UPDATE OF status, is_active, is_deleted, title, property_id, department_id
ON public.training_modules
FOR EACH ROW
EXECUTE FUNCTION public.sync_learning_assignments_after_module_change();

-- 4) Backfill existing invalid assignments immediately.
WITH invalid AS (
  SELECT
    la.id AS assignment_id,
    la.target_type,
    COALESCE(la.target_id, '__everyone__') AS target_scope,
    public.resolve_training_module_write_target(la.content_id) AS replacement_id
  FROM public.learning_assignments la
  JOIN public.training_modules tm
    ON tm.id = la.content_id
  WHERE la.content_type = 'module'
    AND COALESCE(la.is_deleted, false) = false
    AND (
      COALESCE(tm.is_deleted, false) = true
      OR COALESCE(tm.is_active, false) = false
      OR tm.status <> 'published'
    )
)
UPDATE public.learning_assignments la
SET is_deleted = true
FROM invalid i
WHERE la.id = i.assignment_id
  AND i.replacement_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.learning_assignments la2
    WHERE la2.content_type = 'module'
      AND COALESCE(la2.is_deleted, false) = false
      AND la2.content_id = i.replacement_id
      AND la2.target_type = i.target_type
      AND COALESCE(la2.target_id, '__everyone__') = i.target_scope
      AND la2.id <> i.assignment_id
  );

WITH invalid AS (
  SELECT
    la.id AS assignment_id,
    la.target_type,
    COALESCE(la.target_id, '__everyone__') AS target_scope,
    public.resolve_training_module_write_target(la.content_id) AS replacement_id
  FROM public.learning_assignments la
  JOIN public.training_modules tm
    ON tm.id = la.content_id
  WHERE la.content_type = 'module'
    AND COALESCE(la.is_deleted, false) = false
    AND (
      COALESCE(tm.is_deleted, false) = true
      OR COALESCE(tm.is_active, false) = false
      OR tm.status <> 'published'
    )
)
UPDATE public.learning_assignments la
SET content_id = i.replacement_id
FROM invalid i
WHERE la.id = i.assignment_id
  AND i.replacement_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.learning_assignments la2
    WHERE la2.content_type = 'module'
      AND COALESCE(la2.is_deleted, false) = false
      AND la2.content_id = i.replacement_id
      AND la2.target_type = i.target_type
      AND COALESCE(la2.target_id, '__everyone__') = i.target_scope
      AND la2.id <> i.assignment_id
  );

WITH invalid AS (
  SELECT
    la.id AS assignment_id,
    public.resolve_training_module_write_target(la.content_id) AS replacement_id
  FROM public.learning_assignments la
  JOIN public.training_modules tm
    ON tm.id = la.content_id
  WHERE la.content_type = 'module'
    AND COALESCE(la.is_deleted, false) = false
    AND (
      COALESCE(tm.is_deleted, false) = true
      OR COALESCE(tm.is_active, false) = false
      OR tm.status <> 'published'
    )
)
UPDATE public.learning_assignments la
SET is_deleted = true
FROM invalid i
WHERE la.id = i.assignment_id
  AND i.replacement_id IS NULL;;
