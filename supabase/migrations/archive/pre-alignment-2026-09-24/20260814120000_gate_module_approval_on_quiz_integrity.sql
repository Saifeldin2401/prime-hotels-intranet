-- quizIntegrityService's checks are wired into the builder's client-side
-- publishTraining() flow, but that's only one of two paths to
-- status='published' - the review workflow (submit_training_module_for_review
-- -> approve_training_module) has no integrity check at all, client or
-- server. A module with a quiz block pointing at a quiz with zero published
-- questions can reach 'published' through that door, and per
-- complete_training_module (20260814100000_secure_quiz_grading.sql) a
-- mandatory quiz block with nothing to submit makes the module permanently
-- uncompletable for every learner.
--
-- This is a minimum server-side backstop (not a full port of the TS
-- validator's every rule): block approval only when an embedded, mandatory
-- quiz block has no submittable question at all.

CREATE OR REPLACE FUNCTION public.approve_training_module(p_module_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_title text;
    v_author uuid;
    v_block record;
    v_quiz_id uuid;
    v_question_count integer;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr'])
    ) THEN
        RAISE EXCEPTION 'Not authorized to approve training modules';
    END IF;

    FOR v_block IN
        SELECT id, content_data, is_mandatory
          FROM public.training_content_blocks_v
         WHERE training_module_id = p_module_id AND is_deleted = false AND type = 'quiz'
    LOOP
        IF v_block.is_mandatory IS FALSE THEN
            CONTINUE;
        END IF;

        v_quiz_id := public._safe_uuid(v_block.content_data ->> 'quiz_id');
        IF v_quiz_id IS NULL THEN
            RAISE EXCEPTION 'Cannot publish: a required quiz block is not linked to a quiz';
        END IF;

        SELECT count(*) INTO v_question_count
          FROM public.unified_quiz_questions uq
          JOIN public.unified_questions q ON q.id = uq.question_id
         WHERE uq.quiz_id = v_quiz_id AND q.status = 'published';

        IF v_question_count = 0 THEN
            RAISE EXCEPTION 'Cannot publish: a required quiz has no published questions';
        END IF;
    END LOOP;

    UPDATE public.training_modules
    SET status = 'published', updated_at = now(), updated_by = auth.uid()
    WHERE id = p_module_id AND status = 'pending_review'
    RETURNING title, created_by INTO v_title, v_author;

    IF v_title IS NULL THEN
        RAISE EXCEPTION 'Module not found or not pending review';
    END IF;

    PERFORM public.snapshot_training_module_version(p_module_id);

    IF v_author IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, entity_type, entity_id)
        VALUES (
            v_author,
            'training_review_approved',
            'Training module approved',
            '"' || v_title || '" was approved and is now published.',
            '/training/hub/' || p_module_id,
            'training_module',
            p_module_id
        );
    END IF;
END;
$function$;
