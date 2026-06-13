-- Harden RLS scopes for quiz and training resource tables.
-- Fixes:
-- 1) Remove invalid app_role references in training_module_resources policies.
-- 2) Restrict quiz tables from PUBLIC to AUTHENTICATED users only.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) training_module_resources policy hardening
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS training_module_resources_manage_insert ON public.training_module_resources;
DROP POLICY IF EXISTS training_module_resources_manage_update ON public.training_module_resources;
DROP POLICY IF EXISTS training_module_resources_manage_delete ON public.training_module_resources;

CREATE POLICY training_module_resources_manage_insert
ON public.training_module_resources
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(
    (SELECT auth.uid()),
    ARRAY['corporate_admin','regional_admin','regional_hr']::public.app_role[]
  )
  OR (
    public.has_any_role(
      (SELECT auth.uid()),
      ARRAY['property_manager','property_hr','department_head']::public.app_role[]
    )
    AND EXISTS (
      SELECT 1
      FROM public.training_modules tm
      WHERE tm.id = training_module_resources.training_module_id
        AND public.check_property_access(tm.property_id)
    )
  )
);

CREATE POLICY training_module_resources_manage_update
ON public.training_module_resources
FOR UPDATE
TO authenticated
USING (
  public.has_any_role(
    (SELECT auth.uid()),
    ARRAY['corporate_admin','regional_admin','regional_hr']::public.app_role[]
  )
  OR (
    public.has_any_role(
      (SELECT auth.uid()),
      ARRAY['property_manager','property_hr','department_head']::public.app_role[]
    )
    AND EXISTS (
      SELECT 1
      FROM public.training_modules tm
      WHERE tm.id = training_module_resources.training_module_id
        AND public.check_property_access(tm.property_id)
    )
  )
)
WITH CHECK (
  public.has_any_role(
    (SELECT auth.uid()),
    ARRAY['corporate_admin','regional_admin','regional_hr']::public.app_role[]
  )
  OR (
    public.has_any_role(
      (SELECT auth.uid()),
      ARRAY['property_manager','property_hr','department_head']::public.app_role[]
    )
    AND EXISTS (
      SELECT 1
      FROM public.training_modules tm
      WHERE tm.id = training_module_resources.training_module_id
        AND public.check_property_access(tm.property_id)
    )
  )
);

CREATE POLICY training_module_resources_manage_delete
ON public.training_module_resources
FOR DELETE
TO authenticated
USING (
  public.has_any_role(
    (SELECT auth.uid()),
    ARRAY['corporate_admin','regional_admin','regional_hr']::public.app_role[]
  )
  OR (
    public.has_any_role(
      (SELECT auth.uid()),
      ARRAY['property_manager','property_hr','department_head']::public.app_role[]
    )
    AND EXISTS (
      SELECT 1
      FROM public.training_modules tm
      WHERE tm.id = training_module_resources.training_module_id
        AND public.check_property_access(tm.property_id)
    )
  )
);

-- ---------------------------------------------------------------------------
-- 2) Restrict quiz tables to authenticated users
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS learning_quizzes_select ON public.learning_quizzes;
DROP POLICY IF EXISTS learning_quizzes_insert ON public.learning_quizzes;
DROP POLICY IF EXISTS learning_quizzes_update ON public.learning_quizzes;
DROP POLICY IF EXISTS learning_quizzes_delete ON public.learning_quizzes;

CREATE POLICY learning_quizzes_select
ON public.learning_quizzes
FOR SELECT
TO authenticated
USING (
  status = 'published'::public.question_status
  OR created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = ANY (
        ARRAY['regional_admin','regional_hr','property_hr','department_head']::public.app_role[]
      )
  )
);

CREATE POLICY learning_quizzes_insert
ON public.learning_quizzes
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = ANY (
        ARRAY['regional_admin','regional_hr','property_hr','department_head']::public.app_role[]
      )
  )
);

CREATE POLICY learning_quizzes_update
ON public.learning_quizzes
FOR UPDATE
TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = ANY (
        ARRAY['regional_admin','regional_hr','property_hr','department_head']::public.app_role[]
      )
  )
)
WITH CHECK (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = ANY (
        ARRAY['regional_admin','regional_hr','property_hr','department_head']::public.app_role[]
      )
  )
);

CREATE POLICY learning_quizzes_delete
ON public.learning_quizzes
FOR DELETE
TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = ANY (
        ARRAY['regional_admin','regional_hr','property_hr','department_head']::public.app_role[]
      )
  )
);

DROP POLICY IF EXISTS learning_quiz_questions_select ON public.learning_quiz_questions;
DROP POLICY IF EXISTS learning_quiz_questions_insert ON public.learning_quiz_questions;
DROP POLICY IF EXISTS learning_quiz_questions_update ON public.learning_quiz_questions;
DROP POLICY IF EXISTS learning_quiz_questions_delete ON public.learning_quiz_questions;

CREATE POLICY learning_quiz_questions_select
ON public.learning_quiz_questions
FOR SELECT
TO authenticated
USING (
  quiz_id IN (
    SELECT q.id
    FROM public.learning_quizzes q
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = ANY (
        ARRAY['regional_admin','regional_hr','property_hr','department_head']::public.app_role[]
      )
  )
);

CREATE POLICY learning_quiz_questions_insert
ON public.learning_quiz_questions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = ANY (
        ARRAY['regional_admin','regional_hr','property_hr','department_head']::public.app_role[]
      )
  )
);

CREATE POLICY learning_quiz_questions_update
ON public.learning_quiz_questions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = ANY (
        ARRAY['regional_admin','regional_hr','property_hr','department_head']::public.app_role[]
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = ANY (
        ARRAY['regional_admin','regional_hr','property_hr','department_head']::public.app_role[]
      )
  )
);

CREATE POLICY learning_quiz_questions_delete
ON public.learning_quiz_questions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = ANY (
        ARRAY['regional_admin','regional_hr','property_hr','department_head']::public.app_role[]
      )
  )
);

COMMIT;

NOTIFY pgrst, 'reload schema';;
