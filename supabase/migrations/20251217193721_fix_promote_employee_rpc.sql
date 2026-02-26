CREATE OR REPLACE FUNCTION public.promote_employee(
    p_employee_id UUID,
    p_new_role app_role,
    p_new_job_title TEXT,
    p_new_department_id UUID,
    p_effective_date DATE,
    p_notes TEXT,
    p_promoter_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_promotion_id UUID;
    v_old_role app_role;
    v_old_job_title TEXT;
    v_old_department_id UUID;
    v_current_date DATE;
BEGIN
    -- Get current date
    v_current_date := CURRENT_DATE;

    -- Fetch current details
    SELECT job_title INTO v_old_job_title FROM public.profiles WHERE id = p_employee_id;
    
    SELECT role INTO v_old_role FROM public.user_roles WHERE user_id = p_employee_id LIMIT 1;
    
    SELECT department_id INTO v_old_department_id FROM public.user_departments WHERE user_id = p_employee_id LIMIT 1;

    -- Insert Promotion Record
    INSERT INTO public.promotions (
        employee_id,
        promoted_by,
        old_role,
        new_role,
        old_job_title,
        new_job_title,
        old_department_id,
        new_department_id,
        effective_date,
        notes,
        status
    ) VALUES (
        p_employee_id,
        p_promoter_id,
        v_old_role,
        p_new_role,
        v_old_job_title,
        p_new_job_title,
        v_old_department_id,
        p_new_department_id,
        p_effective_date,
        p_notes,
        CASE WHEN p_effective_date <= v_current_date THEN 'completed' ELSE 'pending' END
    ) RETURNING id INTO v_promotion_id;

    -- Apply changes IMMEDIATELY if date is today or present
    IF p_effective_date <= v_current_date THEN
        -- Update Profile Title
        UPDATE public.profiles 
        SET job_title = p_new_job_title, updated_at = NOW() 
        WHERE id = p_employee_id;

        -- Update Role (Delete old, Insert new to avoid constraint issues)
        DELETE FROM public.user_roles WHERE user_id = p_employee_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (p_employee_id, p_new_role);

        -- Update Department
        DELETE FROM public.user_departments WHERE user_id = p_employee_id;
        IF p_new_department_id IS NOT NULL THEN
            INSERT INTO public.user_departments (user_id, department_id)
            VALUES (p_employee_id, p_new_department_id);
        END IF;
    END IF;

    RETURN v_promotion_id;
END;
$$;;
