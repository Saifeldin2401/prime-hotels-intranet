-- Two gaps found in an end-to-end audit of the server-side grading fix:
--
-- 1. enforce_training_progress_integrity() blocked an untrusted write from
--    PROMOTING status to 'completed', but not from DEMOTING it away from
--    'completed'. A background progress-autosave heartbeat can race the
--    completion RPC and write status='in_progress' after passed/completed_at
--    are already set by the trusted RPC, leaving a passed, certificate-
--    eligible row that any status='completed' filter undercounts. Confirmed
--    live: 5 of 11 passed=true training_progress rows currently show
--    status='in_progress'.
--
-- 2. The quiz-integrity gate added for approve_training_module() only
--    guards the optional pending_review -> approve workflow. The builder's
--    actual "Publish" button writes training_modules.status='published'
--    directly and never calls that RPC, so a mandatory quiz block pointing
--    at a quiz with zero published questions can still go live through the
--    primary publish path - which then permanently blocks completion for
--    every learner (complete_training_module requires a submittable attempt
--    for every mandatory quiz block). Fixed with a table-level trigger so
--    the guarantee holds regardless of which code path performs the write.

-- ============================================================================
-- 1. Stop status from regressing off 'completed' via an untrusted write
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_training_progress_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.trusted_progress_write', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.passed := OLD.passed;
    NEW.score_percentage := OLD.score_percentage;
    -- Neither promote to completed nor demote away from it via an untrusted
    -- write - only the trusted RPCs (which set the bypass flag above) may
    -- change completion state.
    IF OLD.status = 'completed' THEN
      NEW.status := 'completed';
    ELSIF NEW.status = 'completed' THEN
      NEW.status := OLD.status;
    END IF;
    IF OLD.completed_at IS NOT NULL THEN
      NEW.completed_at := OLD.completed_at;
    END IF;
  ELSE
    NEW.passed := NULL;
    NEW.score_percentage := NULL;
    NEW.completed_at := NULL;
    IF NEW.status = 'completed' THEN
      NEW.status := 'in_progress';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 2. Validate mandatory-quiz integrity on ANY write that publishes a module
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_module_quiz_integrity(p_module_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_block record;
  v_quiz_id uuid;
  v_question_count integer;
BEGIN
  FOR v_block IN
    SELECT id, content_data, is_mandatory
      FROM public.training_content_blocks_v
     WHERE training_module_id = p_module_id AND is_deleted = false AND type = 'quiz'
  LOOP
    IF v_block.is_mandatory IS FALSE THEN
      CONTINUE;
    END IF;

    v_quiz_id := public._safe_uuid(v_block.content_data ->> 'quiz_id');
    IF v_quiz_id IS NULL THEN
      RAISE EXCEPTION 'Cannot publish: a required quiz block is not linked to a quiz';
    END IF;

    SELECT count(*) INTO v_question_count
      FROM public.unified_quiz_questions uq
      JOIN public.unified_questions q ON q.id = uq.question_id
     WHERE uq.quiz_id = v_quiz_id AND q.status = 'published';

    IF v_question_count = 0 THEN
      RAISE EXCEPTION 'Cannot publish: a required quiz has no published questions';
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_training_module_publish_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.validate_module_quiz_integrity(NEW.id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_training_module_publish_integrity ON public.training_modules;
CREATE TRIGGER trg_enforce_training_module_publish_integrity
  BEFORE INSERT OR UPDATE ON public.training_modules
  FOR EACH ROW
  WHEN (NEW.status = 'published')
  EXECUTE FUNCTION public.enforce_training_module_publish_integrity();

-- approve_training_module's own inline check stays as-is for its specific
-- error-flow ordering - this trigger is now the universal backstop that
-- covers every other write path (direct builder publish included).
