DROP POLICY IF EXISTS unified_question_options_manage ON public.unified_question_options;

CREATE POLICY unified_question_options_select ON public.unified_question_options
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.unified_questions q
    WHERE q.id = unified_question_options.question_id
      AND (
        q.status = 'published'::question_status
        OR q.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
            AND (user_roles.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
        )
      )
  )
);

CREATE POLICY unified_question_options_insert ON public.unified_question_options
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.unified_questions q
    WHERE q.id = unified_question_options.question_id
      AND (
        q.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
            AND (user_roles.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
        )
      )
  )
);

CREATE POLICY unified_question_options_update ON public.unified_question_options
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.unified_questions q
    WHERE q.id = unified_question_options.question_id
      AND (
        q.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
            AND (user_roles.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.unified_questions q
    WHERE q.id = unified_question_options.question_id
      AND (
        q.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
            AND (user_roles.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
        )
      )
  )
);

CREATE POLICY unified_question_options_delete ON public.unified_question_options
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.unified_questions q
    WHERE q.id = unified_question_options.question_id
      AND (
        q.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
            AND (user_roles.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
        )
      )
  )
);
