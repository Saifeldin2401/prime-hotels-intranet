BEGIN;

CREATE OR REPLACE FUNCTION public.check_and_award_achievement(
    p_user_id uuid,
    p_achievement_type public.achievement_type
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
                  AND COALESCE(quiz_score, 0) = 100
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
$$;

CREATE OR REPLACE FUNCTION public.trigger_check_achievements_on_training()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
        PERFORM public.check_and_award_achievement(NEW.user_id, 'training_master');

        IF COALESCE(NEW.quiz_score, 0) = 100 THEN
            PERFORM public.check_and_award_achievement(NEW.user_id, 'perfect_completion');
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_achievements ON public.training_progress;
CREATE TRIGGER trg_check_achievements
    AFTER UPDATE ON public.training_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_check_achievements_on_training();

COMMIT;
