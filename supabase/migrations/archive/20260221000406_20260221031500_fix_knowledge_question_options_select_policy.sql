BEGIN;

DROP POLICY IF EXISTS "Options follow question visibility" ON public.knowledge_question_options;
DROP POLICY IF EXISTS "Options in published quizzes are visible" ON public.knowledge_question_options;

CREATE POLICY "Options follow question visibility"
ON public.knowledge_question_options
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.knowledge_questions q
    WHERE q.id = knowledge_question_options.question_id
      AND (
        q.status = 'published'::public.question_status
        OR q.created_by = (SELECT auth.uid())
        OR q.reviewed_by = (SELECT auth.uid())
        OR public.has_role_optimized('corporate_admin'::public.app_role)
        OR public.has_role_optimized('regional_admin'::public.app_role)
        OR public.has_role_optimized('regional_hr'::public.app_role)
        OR public.has_role_optimized('property_manager'::public.app_role)
        OR public.has_role_optimized('property_hr'::public.app_role)
        OR EXISTS (
          SELECT 1
          FROM public.learning_quiz_questions lqq
          JOIN public.learning_quizzes lq ON lq.id = lqq.quiz_id
          WHERE lqq.question_id = q.id
            AND lq.status = 'published'::public.question_status
            AND COALESCE(lq.is_deleted, false) = false
        )
      )
  )
);

COMMIT;

NOTIFY pgrst, 'reload schema';;
