-- check_and_award_achievement's 'perfect_completion' branch checked training_progress.quiz_score
-- = 100, but quiz_score is a legacy column: nothing in the active completion flow
-- (learningService.submitQuizProgress, called from TrainingPlayer/QuizComponentEnhanced) has ever
-- written to it -- score_percentage is the real, actively-populated column. This achievement could
-- structurally never be earned. Discovered while wiring achievement checks into the Training
-- Player's completion flow (previously check_and_award_achievement was never called from anywhere
-- in the app at all, so the bug was latent).
CREATE OR REPLACE FUNCTION public.check_and_award_achievement(p_user_id uuid, p_achievement_type achievement_type)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_definition RECORD;
    v_already_has BOOLEAN;
    v_qualifies BOOLEAN := false;
    v_training_count INTEGER;
    v_response_time DECIMAL;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_achievements
        WHERE user_id = p_user_id
          AND achievement_type = p_achievement_type
    ) INTO v_already_has;

    IF v_already_has THEN
        RETURN false;
    END IF;

    SELECT *
    INTO v_definition
    FROM public.achievement_definitions
    WHERE achievement_type = p_achievement_type
      AND is_active = true;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    CASE p_achievement_type
        WHEN 'training_master' THEN
            SELECT COUNT(*)
            INTO v_training_count
            FROM public.training_progress
            WHERE user_id = p_user_id
              AND status = 'completed';

            v_qualifies := v_training_count >= COALESCE((v_definition.criteria->>'training_count')::INTEGER, 10);

        WHEN 'perfect_completion' THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.training_progress
                WHERE user_id = p_user_id
                  AND COALESCE(score_percentage, 0) = 100
            ) INTO v_qualifies;

        WHEN 'fast_responder' THEN
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)
            INTO v_response_time
            FROM public.tasks
            WHERE created_by = p_user_id
              AND status = 'completed'
              AND completed_at IS NOT NULL;

            v_qualifies := v_response_time IS NOT NULL
              AND v_response_time <= COALESCE((v_definition.criteria->>'max_hours')::INTEGER, 2);

        WHEN 'streak_master' THEN
            v_qualifies := false;

        ELSE
            v_qualifies := false;
    END CASE;

    IF v_qualifies THEN
        INSERT INTO public.user_achievements (
            user_id,
            achievement_type,
            title,
            description,
            icon,
            color,
            points
        ) VALUES (
            p_user_id,
            p_achievement_type,
            v_definition.title,
            v_definition.description,
            v_definition.icon,
            v_definition.color,
            v_definition.points
        );

        RETURN true;
    END IF;

    RETURN false;
END;
$function$;
