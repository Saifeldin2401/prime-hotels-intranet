-- Migration: 20260822233000_create_training_assignment_submissions.sql
-- Description: Create practical assignment submissions table with RLS and support trainer review/grading lifecycle.

CREATE TABLE IF NOT EXISTS public.training_assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  block_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.training_assignment_rules(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'revision_required', 'approved', 'rejected')),
  submission_content text,
  attachment_urls jsonb DEFAULT '[]'::jsonb,
  score integer CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  passed boolean DEFAULT NULL,
  instructor_feedback text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  submitted_at timestamptz DEFAULT now(),
  attempt_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  UNIQUE(user_id, training_module_id, block_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_training_assignment_subs_user_module
  ON public.training_assignment_submissions (user_id, training_module_id, block_id);

CREATE INDEX IF NOT EXISTS idx_training_assignment_subs_status
  ON public.training_assignment_submissions (status) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_training_assignment_subs_module
  ON public.training_assignment_submissions (training_module_id);

-- Enable RLS
ALTER TABLE public.training_assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Learner & Instructor policies: can read their own submissions or if instructor/manager
DROP POLICY IF EXISTS "Learners and instructors can view submissions" ON public.training_assignment_submissions;
CREATE POLICY "Learners and instructors can view submissions"
  ON public.training_assignment_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_assignments(auth.uid()));

-- Learner policies: can insert their own submissions
DROP POLICY IF EXISTS "Learners can submit own assignments" ON public.training_assignment_submissions;
CREATE POLICY "Learners can submit own assignments"
  ON public.training_assignment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update policy: learners can update their own drafts, instructors can update to grade
DROP POLICY IF EXISTS "Learners and instructors can update submissions" ON public.training_assignment_submissions;
CREATE POLICY "Learners and instructors can update submissions"
  ON public.training_assignment_submissions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_assignments(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.can_manage_assignments(auth.uid()));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_training_assignment_submissions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_training_assignment_submissions_updated_at ON public.training_assignment_submissions;
CREATE TRIGGER set_training_assignment_submissions_updated_at
  BEFORE UPDATE ON public.training_assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_training_assignment_submissions_updated_at();

-- Update complete_training_module RPC to verify mandatory assignment submissions with approval
CREATE OR REPLACE FUNCTION public.complete_training_module(
  p_module_id uuid,
  p_assignment_id uuid DEFAULT NULL::uuid,
  p_completed_block_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_last_block_id uuid DEFAULT NULL::uuid,
  p_last_block_index integer DEFAULT 0,
  p_time_spent_seconds integer DEFAULT 0
)
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
  v_require_approval boolean;
  v_session record;
  v_assignment_sub record;
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
    -- 1. Evaluate Quiz Blocks
    IF v_block.type = 'quiz' THEN
      v_quiz_id := public._safe_uuid(v_block.content_data ->> 'quiz_id');
      IF v_quiz_id IS NULL THEN
        CONTINUE;
      END IF;

      SELECT title INTO v_quiz_title FROM public.learning_quizzes WHERE id = v_quiz_id;
      v_quiz_title := COALESCE(v_block.content_data ->> 'title', v_block.title, v_quiz_title, 'Knowledge Check');

      v_require_pass := COALESCE(v_block.content_data ->> 'completion_requirement', '') <> 'submitted'
        AND COALESCE((v_block.content_data ->> 'require_passing')::boolean, true);

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

    -- 2. Evaluate Assignment / Practical Blocks
    ELSIF v_block.type = 'assignment' OR v_block.type = 'practical'
          OR COALESCE((v_block.content_data ->> 'is_assignment')::boolean, false)
          OR COALESCE((v_block.content_data ->> 'requires_submission')::boolean, false) THEN
      
      v_require_approval := COALESCE((v_block.content_data ->> 'requires_instructor_approval')::boolean, true);

      SELECT * INTO v_assignment_sub
        FROM public.training_assignment_submissions
       WHERE user_id = v_user_id
         AND training_module_id = p_module_id
         AND block_id = v_block.id::text
         AND is_deleted = false
       ORDER BY attempt_number DESC, created_at DESC
       LIMIT 1;

      IF v_block.is_mandatory IS NOT FALSE THEN
        IF NOT FOUND OR v_assignment_sub.status = 'draft' THEN
          RAISE EXCEPTION 'Assignment "%" has not been submitted yet', COALESCE(v_block.title, 'Assignment');
        END IF;

        IF v_require_approval THEN
          IF v_assignment_sub.status IN ('submitted', 'under_review') THEN
            RAISE EXCEPTION 'Assignment "%" is awaiting instructor review', COALESCE(v_block.title, 'Assignment');
          ELSIF v_assignment_sub.status IN ('revision_required', 'rejected') THEN
            RAISE EXCEPTION 'Assignment "%" requires revisions before module completion', COALESCE(v_block.title, 'Assignment');
          ELSIF v_assignment_sub.status <> 'approved' THEN
            RAISE EXCEPTION 'Assignment "%" has not been approved yet', COALESCE(v_block.title, 'Assignment');
          END IF;
        END IF;
      END IF;

      IF FOUND AND v_assignment_sub.score IS NOT NULL THEN
        v_score_sum := v_score_sum + v_assignment_sub.score;
        v_score_n := v_score_n + 1;
      END IF;

    -- 3. Standard Non-Quiz / Non-Assignment Content Blocks
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

GRANT EXECUTE ON FUNCTION public.complete_training_module(uuid, uuid, uuid[], uuid, integer, integer) TO authenticated;
