-- 1. Harden sync_lms_to_onboarding
CREATE OR REPLACE FUNCTION sync_lms_to_onboarding()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if progress is 100% or status is completed
    IF (NEW.status = 'completed' OR NEW.progress_percentage = 100) THEN
        -- Find the associated onboarding task via the assignment
        UPDATE public.onboarding_tasks ot
        SET 
            is_completed = true,
            status = 'completed',
            completed_at = COALESCE(NEW.completed_at, NOW())
        FROM public.learning_assignments la
        WHERE ot.id = la.onboarding_task_id
        AND la.id = NEW.assignment_id
        AND ot.is_completed = false;
    END IF;
    RETURN NEW;    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Harden update_updated_at_column (Utility function)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;;
