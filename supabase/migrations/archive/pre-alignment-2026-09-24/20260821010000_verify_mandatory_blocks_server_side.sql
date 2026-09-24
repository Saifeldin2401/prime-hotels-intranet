-- Functional-correctness + integrity fix (from a full training-system audit):
-- complete_training_module() trusted the client-supplied p_completed_block_ids
-- array for every non-quiz mandatory content block (video, document, SOP,
-- etc.) with no independent verification. The Training Player's sidebar lets
-- a learner jump directly to any block (setActiveBlockIndex) with no gating
-- check at all - only the footer Next/Complete button respects
-- canProceedToNext. A learner could skip straight to the last block via the
-- sidebar, never satisfying an earlier mandatory video's watch-gate, and the
-- client's own "auto-include remaining content blocks" fallback (once all
-- mandatory QUIZZES are done) would silently add the skipped block's id to
-- the array sent to this RPC anyway - so the module completed successfully
-- with a mandatory block that was never actually watched/read.
--
-- training_block_progress already exists and is already written by the
-- Training Player (TrainingPlayer.tsx recordBlockCompletion()) exactly at
-- the moments a block's real completion signal fires: the Next button
-- (only clickable once any gate is satisfied), an explicit "mark as
-- watched" action once a media gate threshold is reached, or a quiz
-- completion. A block reached only via a sidebar jump never gets a row
-- here. This migration makes that table the authoritative signal for
-- non-quiz mandatory blocks, instead of the client-supplied id array (which
-- is now only used for the informational completed_blocks metadata field).
CREATE OR REPLACE FUNCTION public.complete_training_module(p_module_id uuid, p_assignment_id uuid DEFAULT NULL::uuid, p_completed_block_ids uuid[] DEFAULT ARRAY[]::uuid[], p_last_block_id uuid DEFAULT NULL::uuid, p_last_block_index integer DEFAULT 0, p_time_spent_seconds integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_module public.training_modules%ROWTYPE;
  v_block record;
  v_quiz_id uuid;
  v_quiz_title text;
  v_require_pass boolean;
  v_session record;
  v_found boolean;
  v_score_sum numeric := 0;
  v_score_n integer := 0;
  v_final_score numeric;
  v_existing public.training_progress%ROWTYPE;
  v_metadata jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_module FROM public.training_modules WHERE id = p_module_id AND is_deleted = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Training module not found';
  END IF;

  FOR v_block IN
    SELECT id, type, title, content_data, is_mandatory
      FROM public.training_content_blocks_v
     WHERE training_module_id = p_module_id AND is_deleted = false
  LOOP
    IF v_block.type = 'quiz' THEN
      v_quiz_id := public._safe_uuid(v_block.content_data ->> 'quiz_id');
      IF v_quiz_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Resolve best quiz title for clear error messages
      SELECT title INTO v_quiz_title FROM public.learning_quizzes WHERE id = v_quiz_id;
      v_quiz_title := COALESCE(v_block.content_data ->> 'title', v_block.title, v_quiz_title, 'Knowledge Check');

      v_require_pass := COALESCE(v_block.content_data ->> 'completion_requirement', '') <> 'submitted'
        AND COALESCE((v_block.content_data ->> 'require_passing')::boolean, true);

      -- 1. Try matching session with block, module, or quiz context
      SELECT * INTO v_session
        FROM public.unified_quiz_sessions
       WHERE user_id = v_user_id
         AND quiz_type = 'learning_quiz'
         AND quiz_entity_id = v_quiz_id
         AND (
           context_entity_id = v_block.id
           OR context_entity_id = p_module_id
           OR context_entity_id = v_quiz_id
           OR context_entity_id IS NULL
         )
         AND completed_at IS NOT NULL
       ORDER BY passed DESC NULLS LAST, score_percentage DESC NULLS LAST, completed_at DESC
       LIMIT 1;
      v_found := FOUND;

      -- 2. Fallback to any completed session for this quiz
      IF NOT v_found THEN
        SELECT * INTO v_session
          FROM public.unified_quiz_sessions
         WHERE user_id = v_user_id
           AND quiz_type = 'learning_quiz'
           AND quiz_entity_id = v_quiz_id
           AND completed_at IS NOT NULL
         ORDER BY passed DESC NULLS LAST, score_percentage DESC NULLS LAST, completed_at DESC
         LIMIT 1;
        v_found := FOUND;
      END IF;

      -- 3. Fallback to training_progress row for this quiz
      IF NOT v_found THEN
        SELECT * INTO v_existing
          FROM public.training_progress
         WHERE user_id = v_user_id
           AND training_id = v_quiz_id
           AND lp_content_type = 'quiz'
           AND status = 'completed';
        IF FOUND THEN
          v_found := true;
          IF v_existing.passed IS TRUE THEN
            v_score_sum := v_score_sum + COALESCE(v_existing.score_percentage, 100);
            v_score_n := v_score_n + 1;
          END IF;
        END IF;
      END IF;

      IF v_block.is_mandatory IS NOT FALSE THEN
        IF NOT v_found THEN
          RAISE EXCEPTION 'Quiz "%" has not been submitted yet', v_quiz_title;
        END IF;
        IF v_require_pass AND (v_session.passed IS NOT TRUE AND (v_existing.passed IS NULL OR v_existing.passed IS NOT TRUE)) THEN
          RAISE EXCEPTION 'Quiz "%" has not been passed yet', v_quiz_title;
        END IF;
      END IF;

      IF v_found AND v_session.score_percentage IS NOT NULL THEN
        v_score_sum := v_score_sum + v_session.score_percentage;
        v_score_n := v_score_n + 1;
      END IF;
    ELSIF v_block.is_mandatory IS NOT FALSE THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.training_block_progress tbp
         WHERE tbp.user_id = v_user_id
           AND tbp.block_id = v_block.id
           AND tbp.completed_at IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'Required content "%" has not been completed yet', COALESCE(v_block.content_data ->> 'title', v_block.title, 'required content');
      END IF;
    END IF;
  END LOOP;

  v_final_score := CASE WHEN v_score_n > 0 THEN round(v_score_sum / v_score_n) ELSE NULL END;

  SELECT * INTO v_existing FROM public.training_progress
   WHERE user_id = v_user_id AND training_id = p_module_id AND lp_content_type = 'module';

  v_metadata := COALESCE(v_existing.metadata, '{}'::jsonb) || jsonb_build_object(
    'completed_blocks', to_jsonb(COALESCE(p_completed_block_ids, ARRAY[]::uuid[])),
    'active_block_id', p_last_block_id
  );

  PERFORM set_config('app.trusted_progress_write', 'on', true);

  INSERT INTO public.training_progress (
    user_id, training_id, lp_content_type, assignment_id, status,
    progress_percentage, score_percentage, passed, completed_at,
    last_accessed_at, last_activity_at, last_block_id, last_block_index,
    time_spent_seconds, metadata, updated_at
  ) VALUES (
    v_user_id, p_module_id, 'module', p_assignment_id, 'completed',
    100, v_final_score, true, now(),
    now(), now(), p_last_block_id, p_last_block_index,
    p_time_spent_seconds, v_metadata, now()
  )
  ON CONFLICT (user_id, training_id) DO UPDATE SET
    lp_content_type = 'module',
    assignment_id = COALESCE(public.training_progress.assignment_id, EXCLUDED.assignment_id),
    status = 'completed',
    progress_percentage = 100,
    score_percentage = COALESCE(EXCLUDED.score_percentage, public.training_progress.score_percentage),
    passed = true,
    completed_at = COALESCE(public.training_progress.completed_at, EXCLUDED.completed_at),
    last_accessed_at = EXCLUDED.last_accessed_at,
    last_activity_at = EXCLUDED.last_activity_at,
    last_block_id = EXCLUDED.last_block_id,
    last_block_index = EXCLUDED.last_block_index,
    time_spent_seconds = GREATEST(COALESCE(public.training_progress.time_spent_seconds, 0), COALESCE(EXCLUDED.time_spent_seconds, 0)),
    metadata = EXCLUDED.metadata,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_existing;

  RETURN jsonb_build_object(
    'training_progress_id', v_existing.id,
    'score_percentage', v_existing.score_percentage,
    'passed', v_existing.passed,
    'status', v_existing.status,
    'completed_at', v_existing.completed_at
  );
END;
$function$;
