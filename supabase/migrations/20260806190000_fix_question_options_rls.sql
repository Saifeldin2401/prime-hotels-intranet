-- unified_question_options had a single overly-broad policy: cmd ALL, USING/WITH CHECK just
-- "auth.uid() IS NOT NULL". This backs every quiz/certification/SOP-inline question across the
-- app. Unlike its parent table unified_questions (which correctly restricts write access to the
-- question's creator or admin-tier roles, and read access to published questions + own/admin),
-- ANY authenticated user could directly INSERT/UPDATE/DELETE rows here -- including flipping
-- is_correct on any option for any question, published or not, including live certification
-- exams -- and could SELECT options for draft/unpublished questions they have no business
-- seeing. Split into scoped policies mirroring unified_questions' authorization exactly, joined
-- through question_id since options have no created_by of their own.
--
-- Note: this does not address a separate, architecturally distinct issue -- is_correct is
-- still sent to the client in the options payload while a quiz is being taken (grading happens
-- client-side), so a user can see it via network inspection during their own attempt. Closing
-- that requires moving grading server-side and is a larger change, out of scope here; this
-- migration only closes the "anyone can rewrite the answer key or read other questions' options
-- outright" gap.

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
