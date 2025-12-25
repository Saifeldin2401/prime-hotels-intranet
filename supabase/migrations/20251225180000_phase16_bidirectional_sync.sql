-- Phase 16: Bidirectional Onboarding-Training Sync & Cross-Linking

-- 1. Update learning_assignments schema
ALTER TABLE public.learning_assignments 
ADD COLUMN IF NOT EXISTS onboarding_process_id UUID REFERENCES public.onboarding_process(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS onboarding_task_id UUID REFERENCES public.onboarding_tasks(id) ON DELETE CASCADE;

-- 2. Function: Sync LMS completion to Onboarding Task
CREATE OR REPLACE FUNCTION public.sync_lms_to_onboarding()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger: LMS -> Onboarding
DROP TRIGGER IF EXISTS trg_sync_lms_to_onboarding ON public.learning_progress;
CREATE TRIGGER trg_sync_lms_to_onboarding
AFTER INSERT OR UPDATE OF status, progress_percentage ON public.learning_progress
FOR EACH ROW EXECUTE FUNCTION public.sync_lms_to_onboarding();

-- 4. Function: Sync Onboarding Task completion to LMS
CREATE OR REPLACE FUNCTION public.sync_onboarding_to_lms()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if it's a training task and being marked as completed
    IF (NEW.link_type = 'training' AND NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL)) THEN
        -- Mark the linked learning progress as completed
        -- We find it via the assignment link
        UPDATE public.learning_progress lp
        SET 
            status = 'completed',
            progress_percentage = 100,
            completed_at = COALESCE(NEW.completed_at, NOW())
        FROM public.learning_assignments la
        WHERE lp.assignment_id = la.id
        AND la.onboarding_task_id = NEW.id
        AND (lp.status != 'completed' OR lp.progress_percentage < 100);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger: Onboarding -> LMS
DROP TRIGGER IF EXISTS trg_sync_onboarding_to_lms ON public.onboarding_tasks;
CREATE TRIGGER trg_sync_onboarding_to_lms
AFTER UPDATE OF is_completed ON public.onboarding_tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_onboarding_to_lms();

-- 6. Update existing handle_new_user_onboarding to store the link
-- This is a partial replacement of the task insertion loop to include onboarding_task_id in assignments
-- Note: We actually handle the assignment creation IN handle_new_user_onboarding in Phase 14.
-- Let's ensure it stores the IDs correctly.
