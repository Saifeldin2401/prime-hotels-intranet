-- 1. Fix profiles schema to support ID-based job titles
-- Add job_title_id if it doesn't exist (it seems it's missing)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'job_title_id') THEN
        ALTER TABLE public.profiles ADD COLUMN job_title_id UUID REFERENCES public.job_titles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Create the unified training rule applicator
CREATE OR REPLACE FUNCTION public.apply_training_rules_to_user()
RETURNS trigger AS $$
DECLARE
    v_user_id UUID;
    v_department_id UUID;
    v_role app_role;
    v_job_title_id UUID;
BEGIN
    -- Determine user_id based on which table triggered this
    IF TG_TABLE_NAME = 'user_departments' THEN
        v_user_id := NEW.user_id;
        v_department_id := NEW.department_id;
    ELSIF TG_TABLE_NAME = 'user_roles' THEN
        v_user_id := NEW.user_id;
        v_role := NEW.role;
    ELSIF TG_TABLE_NAME = 'profiles' THEN
        v_user_id := NEW.id;
        v_job_title_id := NEW.job_title_id;
    END IF;

    -- Insert assignments for matches
    -- We join with rules that match ANY of the conditions
    INSERT INTO public.learning_assignments (
        target_type,
        target_id,
        content_type,
        content_id,
        due_date,
        priority,
        assigned_by,
        created_at
    )
    SELECT 
        'user'::learning_target_type,
        v_user_id::text,
        'module'::learning_content_type,
        tar.training_module_id,
        (NOW() + interval '30 days'),
        'normal',
        tar.created_by,
        NOW()
    FROM public.training_assignment_rules tar
    WHERE tar.is_active = true
    AND (
        (tar.target_department_id = v_department_id)
        OR (tar.target_role = v_role::text)
        OR (tar.job_title_id = v_job_title_id)
    )
    -- Don't duplicate if already assigned
    AND NOT EXISTS (
        SELECT 1 FROM public.learning_assignments la 
        WHERE la.target_id = v_user_id::text 
        AND la.content_id = tar.training_module_id
        AND la.content_type = 'module'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Set up triggers
DROP TRIGGER IF EXISTS on_user_role_assigned ON public.user_roles;
CREATE TRIGGER on_user_role_assigned
    AFTER INSERT ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.apply_training_rules_to_user();

DROP TRIGGER IF EXISTS trg_apply_training_rules_dept ON public.user_departments;
CREATE TRIGGER trg_apply_training_rules_dept
    AFTER INSERT ON public.user_departments
    FOR EACH ROW EXECUTE FUNCTION public.apply_training_rules_to_user();

DROP TRIGGER IF EXISTS trg_apply_training_rules_profile ON public.profiles;
CREATE TRIGGER trg_apply_training_rules_profile
    AFTER UPDATE OF job_title_id ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.apply_training_rules_to_user();
;
