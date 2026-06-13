-- Migration: Sync learning_progress to training_progress for legacy dashboard hooks
-- Description: Creates a trigger to mirror completed state from new LMS to old LMS tables

CREATE OR REPLACE FUNCTION public.sync_learning_to_training_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync module and quiz progress back to training_progress for backward compatibility
    IF NEW.content_type IN ('module', 'quiz') THEN
        INSERT INTO public.training_progress (
            user_id, 
            training_id, 
            status, 
            completed_at,
            quiz_score,
            updated_at
        ) VALUES (
            NEW.user_id,
            NEW.content_id,
            CASE 
                WHEN NEW.status = 'assigned' THEN 'not_started'::training_status
                WHEN NEW.status = 'in_progress' THEN 'in_progress'::training_status
                WHEN NEW.status = 'completed' THEN 'completed'::training_status
                ELSE 'not_started'::training_status
            END,
            NEW.completed_at,
            NEW.score_percentage,
            NOW()
        )
        ON CONFLICT (user_id, training_id) DO UPDATE SET
            status = EXCLUDED.status,
            completed_at = EXCLUDED.completed_at,
            quiz_score = EXCLUDED.quiz_score,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_learning_to_training_progress_sync ON public.learning_progress;

CREATE TRIGGER trg_sync_learning_to_training_progress_sync
AFTER INSERT OR UPDATE ON public.learning_progress
FOR EACH ROW EXECUTE FUNCTION public.sync_learning_to_training_progress();
