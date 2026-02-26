-- Fix type mismatch in sync trigger
CREATE OR REPLACE FUNCTION public.sync_training_completion_to_onboarding()
RETURNS trigger AS $$
BEGIN
  -- If training is completed, find matching onboarding task and mark it done
  -- Explicitly casting types to handle text/uuid differences
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.onboarding_tasks
    SET is_completed = true, 
        status = 'completed',
        completed_at = NOW()
    WHERE assigned_to_id::text = NEW.target_id::text
      AND link_type = 'training'
      AND link_id = NEW.content_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
;
