BEGIN;

CREATE OR REPLACE FUNCTION public.award_module_skills(
    p_user_id uuid,
    p_module_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_can_manage boolean := false;
    v_rows_affected integer := 0;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = ANY (ARRAY[
              'corporate_admin'::public.app_role,
              'regional_admin'::public.app_role,
              'regional_hr'::public.app_role,
              'property_manager'::public.app_role,
              'property_hr'::public.app_role,
              'department_head'::public.app_role
          ])
    )
    INTO v_can_manage;

    IF p_user_id <> auth.uid() AND NOT v_can_manage THEN
        RAISE EXCEPTION 'Not authorized to award skills for this user';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.learning_progress lp
        WHERE lp.user_id = p_user_id
          AND lp.content_type = 'module'
          AND lp.content_id = p_module_id
          AND lp.status = 'completed'
          AND COALESCE(lp.is_deleted, false) = false
    ) AND NOT EXISTS (
        SELECT 1
        FROM public.training_progress tp
        WHERE tp.user_id = p_user_id
          AND tp.training_id = p_module_id
          AND tp.status = 'completed'
          AND COALESCE(tp.is_deleted, false) = false
    ) THEN
        RETURN 0;
    END IF;

    INSERT INTO public.user_skills (
        user_id,
        skill_id,
        proficiency_level,
        verified
    )
    SELECT
        p_user_id,
        ms.skill_id,
        LEAST(GREATEST(COALESCE(ms.points_awarded, 1), 1), 5),
        false
    FROM public.module_skills ms
    WHERE ms.module_id = p_module_id
    ON CONFLICT (user_id, skill_id) DO UPDATE
    SET proficiency_level = GREATEST(public.user_skills.proficiency_level, EXCLUDED.proficiency_level),
        verified = public.user_skills.verified
    WHERE public.user_skills.proficiency_level < EXCLUDED.proficiency_level;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$$;

REVOKE ALL ON FUNCTION public.award_module_skills(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_module_skills(uuid, uuid) TO authenticated;

COMMIT;
