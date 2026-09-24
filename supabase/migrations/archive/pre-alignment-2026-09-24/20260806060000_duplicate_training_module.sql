-- No way to clone an existing module as a starting point for a new one -- every module was
-- built from scratch or from a static template. duplicate_training_module deep-copies a
-- module's metadata and content blocks (content blocks are stored as documents rows with
-- content_type='training_block' -- see training_content_blocks_v) into a new draft module.
-- Linked quizzes are intentionally NOT deep-copied -- the clone's quiz blocks keep pointing at
-- the same underlying quiz, matching how a quiz block already just references a quiz_id.

CREATE OR REPLACE FUNCTION public.duplicate_training_module(p_module_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_new_module_id uuid;
    v_source public.training_modules%ROWTYPE;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.training_modules m
        WHERE m.id = p_module_id
          AND (m.created_by = auth.uid() OR m.updated_by = auth.uid()
               OR EXISTS (
                   SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = auth.uid()
                     AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_manager'])
               ))
    ) THEN
        RAISE EXCEPTION 'Not authorized to duplicate this module';
    END IF;

    SELECT * INTO v_source FROM public.training_modules WHERE id = p_module_id;
    IF v_source IS NULL THEN
        RAISE EXCEPTION 'Module not found';
    END IF;

    INSERT INTO public.training_modules (
        title, description, estimated_duration_minutes, property_id, department_id,
        validity_period_days, allow_retake, max_attempts, auto_advance, show_feedback,
        randomize_questions, show_answers, time_limit_minutes, audience, content_language,
        template_id, passing_score_percentage, status, category, difficulty_level,
        certificate_enabled, created_by
    )
    VALUES (
        v_source.title || ' (Copy)', v_source.description, v_source.estimated_duration_minutes,
        v_source.property_id, v_source.department_id, v_source.validity_period_days,
        v_source.allow_retake, v_source.max_attempts, v_source.auto_advance, v_source.show_feedback,
        v_source.randomize_questions, v_source.show_answers, v_source.time_limit_minutes,
        v_source.audience, v_source.content_language, v_source.template_id,
        v_source.passing_score_percentage, 'draft', v_source.category, v_source.difficulty_level,
        v_source.certificate_enabled, auth.uid()
    )
    RETURNING id INTO v_new_module_id;

    INSERT INTO public.documents (
        title, status, created_by, content, content_type, training_module_id,
        block_type, block_order, content_data, is_mandatory, duration_seconds, points,
        content_url, ai_generated, ai_source_content, visibility
    )
    SELECT
        d.title, d.status, auth.uid(), d.content, 'training_block', v_new_module_id,
        d.block_type, d.block_order, d.content_data, d.is_mandatory, d.duration_seconds, d.points,
        d.content_url, d.ai_generated, d.ai_source_content, d.visibility
    FROM public.documents d
    WHERE d.training_module_id = p_module_id
      AND d.content_type = 'training_block'
      AND d.is_deleted = false;

    RETURN v_new_module_id;
END;
$function$;

COMMENT ON FUNCTION public.duplicate_training_module IS
    'Deep-copies a training module (metadata + content blocks) into a new draft module. Quiz blocks keep referencing the original quiz.';

REVOKE EXECUTE ON FUNCTION public.duplicate_training_module(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.duplicate_training_module(uuid) TO authenticated;
