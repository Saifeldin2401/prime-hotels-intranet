-- ============================================================================
-- MIGRATION: fix_promote_employee_wrong_table_and_columns
-- Discovered while functionally testing the auth fix from the previous
-- migration: promote_employee() has ALWAYS been completely broken, separate
-- from the authorization gap. It inserted into a table `public.promotions`
-- that does not exist -- the real table is `employee_promotions`, with
-- entirely different column names (to_role/from_role as text not app_role,
-- to_title/from_title not new_job_title/old_job_title, approved_by not
-- promoted_by, no status column at all). Every call to this RPC has always
-- errored out with "relation public.promotions does not exist" -- promotions
-- have never actually been recorded via this function.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-01.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.promote_employee(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_effective_date date, p_notes text, p_promoter_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_promotion_id UUID;
    v_old_role app_role;
    v_old_job_title TEXT;
    v_old_department_id UUID;
    v_current_date DATE;
    v_caller UUID := auth.uid();
BEGIN
    IF NOT is_hr_or_admin(v_caller) THEN
        RAISE EXCEPTION 'Unauthorized: only HR or admin roles may promote employees';
    END IF;

    IF p_new_role IN ('super_admin', 'corporate_admin', 'regional_admin', 'regional_hr')
       AND NOT (has_role(v_caller, 'corporate_admin'::app_role) OR has_role(v_caller, 'regional_admin'::app_role)) THEN
        RAISE EXCEPTION 'Unauthorized: only corporate_admin or regional_admin may grant top-tier admin roles';
    END IF;

    v_current_date := CURRENT_DATE;

    SELECT job_title INTO v_old_job_title FROM public.profiles WHERE id = p_employee_id;
    SELECT role INTO v_old_role FROM public.user_roles WHERE user_id = p_employee_id LIMIT 1;
    SELECT department_id INTO v_old_department_id FROM public.user_departments WHERE user_id = p_employee_id LIMIT 1;

    INSERT INTO public.employee_promotions (
        employee_id,
        from_role,
        to_role,
        from_title,
        to_title,
        from_department_id,
        to_department_id,
        effective_date,
        approved_by,
        notes
    ) VALUES (
        p_employee_id,
        v_old_role::text,
        p_new_role::text,
        v_old_job_title,
        p_new_job_title,
        v_old_department_id,
        p_new_department_id,
        p_effective_date,
        v_caller,
        p_notes
    ) RETURNING id INTO v_promotion_id;

    -- Apply changes IMMEDIATELY if date is today or present
    IF p_effective_date <= v_current_date THEN
        UPDATE public.profiles
        SET job_title = p_new_job_title, updated_at = NOW()
        WHERE id = p_employee_id;

        DELETE FROM public.user_roles WHERE user_id = p_employee_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (p_employee_id, p_new_role);

        DELETE FROM public.user_departments WHERE user_id = p_employee_id;
        IF p_new_department_id IS NOT NULL THEN
            INSERT INTO public.user_departments (user_id, department_id)
            VALUES (p_employee_id, p_new_department_id);
        END IF;
    END IF;

    RETURN v_promotion_id;
END;
$function$;
