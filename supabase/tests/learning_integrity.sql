-- Learning-integrity regression tests (completion, quizzes, certificates, recertification).
--
-- Self-contained: builds its own tenant, users, module and quiz inside a
-- transaction, impersonates each user through request.jwt.claims + the
-- `authenticated` role (exactly what PostgREST does), and ROLLS BACK at the end.
-- Any failed expectation raises and aborts the run.
--
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/learning_integrity.sql
--
-- Covers the audit findings of 2026-09-24: self-inserted passing quiz sessions,
-- self-approved practical submissions, learner-editable mandatory assignments,
-- readable answer keys / grading oracle, module passing score, certificate score
-- and expiry, and recertification cycles.

BEGIN;

-- ---------------------------------------------------------------------------
-- Fixtures (as the migration owner)
-- ---------------------------------------------------------------------------
SELECT set_config('t.org',      gen_random_uuid()::text, true),
       set_config('t.org2',     gen_random_uuid()::text, true),
       set_config('t.learner',  gen_random_uuid()::text, true),
       set_config('t.manager',  gen_random_uuid()::text, true),
       set_config('t.outsider', gen_random_uuid()::text, true),
       set_config('t.module',   gen_random_uuid()::text, true),
       set_config('t.quiz',     gen_random_uuid()::text, true),
       set_config('t.q1',       gen_random_uuid()::text, true),
       set_config('t.q2',       gen_random_uuid()::text, true),
       set_config('t.q1_right', gen_random_uuid()::text, true),
       set_config('t.q1_wrong', gen_random_uuid()::text, true),
       set_config('t.q2_right', gen_random_uuid()::text, true),
       set_config('t.q2_wrong', gen_random_uuid()::text, true),
       set_config('t.b_text',   gen_random_uuid()::text, true),
       set_config('t.b_quiz',   gen_random_uuid()::text, true),
       set_config('t.b_prac',   gen_random_uuid()::text, true);

INSERT INTO public.organizations (id, name, slug)
VALUES (current_setting('t.org')::uuid,  'Integrity Test Org',  'integrity-test-' || left(current_setting('t.org'), 8)),
       (current_setting('t.org2')::uuid, 'Integrity Other Org', 'integrity-other-' || left(current_setting('t.org2'), 8));

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  (current_setting('t.learner')::uuid,  'learner-'  || left(current_setting('t.learner'), 8)  || '@integrity.test',
   jsonb_build_object('organization_id', current_setting('t.org'),  'role', 'learner',          'full_name', 'Test Learner')),
  (current_setting('t.manager')::uuid,  'manager-'  || left(current_setting('t.manager'), 8)  || '@integrity.test',
   jsonb_build_object('organization_id', current_setting('t.org'),  'role', 'training_manager', 'full_name', 'Test Manager')),
  (current_setting('t.outsider')::uuid, 'outsider-' || left(current_setting('t.outsider'), 8) || '@integrity.test',
   jsonb_build_object('organization_id', current_setting('t.org2'), 'role', 'learner',          'full_name', 'Other Tenant'));

INSERT INTO public.training_modules (id, organization_id, title, passing_score_percentage, certificate_enabled, validity_period_days)
VALUES (current_setting('t.module')::uuid, current_setting('t.org')::uuid, 'Integrity Module', 80, true, 365);

INSERT INTO public.learning_quizzes (id, organization_id, title, status, passing_score_percentage, show_feedback_during, created_by)
VALUES (current_setting('t.quiz')::uuid, current_setting('t.org')::uuid, 'Integrity Quiz', 'published', 50, false,
        current_setting('t.manager')::uuid);

INSERT INTO public.unified_questions (id, organization_id, question_text, question_type, status, created_by)
VALUES (current_setting('t.q1')::uuid, current_setting('t.org')::uuid, 'Q1?', 'mcq', 'published', current_setting('t.manager')::uuid),
       (current_setting('t.q2')::uuid, current_setting('t.org')::uuid, 'Q2?', 'mcq', 'published', current_setting('t.manager')::uuid);

INSERT INTO public.unified_question_options (id, organization_id, question_id, option_text, is_correct, display_order)
VALUES (current_setting('t.q1_right')::uuid, current_setting('t.org')::uuid, current_setting('t.q1')::uuid, 'right', true,  1),
       (current_setting('t.q1_wrong')::uuid, current_setting('t.org')::uuid, current_setting('t.q1')::uuid, 'wrong', false, 2),
       (current_setting('t.q2_right')::uuid, current_setting('t.org')::uuid, current_setting('t.q2')::uuid, 'right', true,  1),
       (current_setting('t.q2_wrong')::uuid, current_setting('t.org')::uuid, current_setting('t.q2')::uuid, 'wrong', false, 2);

INSERT INTO public.unified_quiz_questions (organization_id, quiz_id, question_id, display_order)
VALUES (current_setting('t.org')::uuid, current_setting('t.quiz')::uuid, current_setting('t.q1')::uuid, 1),
       (current_setting('t.org')::uuid, current_setting('t.quiz')::uuid, current_setting('t.q2')::uuid, 2);

INSERT INTO public.documents (id, organization_id, title, content_type, training_module_id, block_type, block_order, is_mandatory, content_data)
VALUES
  (current_setting('t.b_text')::uuid, current_setting('t.org')::uuid, 'Read me', 'training_block', current_setting('t.module')::uuid, 'text', 1, true, '{}'::jsonb),
  (current_setting('t.b_quiz')::uuid, current_setting('t.org')::uuid, 'Check',   'training_block', current_setting('t.module')::uuid, 'quiz', 2, true,
   jsonb_build_object('quiz_id', current_setting('t.quiz'))),
  (current_setting('t.b_prac')::uuid, current_setting('t.org')::uuid, 'Do it',   'training_block', current_setting('t.module')::uuid, 'practical', 3, true, '{}'::jsonb);

-- The learner's mandatory individual assignment.
INSERT INTO public.training_assignment_rules (organization_id, target_type, target_id, content_type, content_id, training_module_id, scope_type, is_active, status, is_mandatory, assigned_by)
VALUES (current_setting('t.org')::uuid, 'user', current_setting('t.learner'), 'module', current_setting('t.module')::uuid, current_setting('t.module')::uuid, 'individual', true, 'active', true,
        current_setting('t.manager')::uuid);

-- ---------------------------------------------------------------------------
-- Learner: direct writes that used to forge completion must fail
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_ok boolean;
  v_n integer;
  v_status text;
BEGIN
  -- C1: forged passing quiz session
  v_ok := false;
  BEGIN
    INSERT INTO public.unified_quiz_sessions (user_id, quiz_type, quiz_entity_id, completed_at, passed, score_percentage)
    VALUES (auth.uid(), 'learning_quiz', current_setting('t.quiz')::uuid, now(), true, 100);
  EXCEPTION WHEN insufficient_privilege THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL C1: learner inserted a quiz session'; END IF;

  -- C3: learner cannot create, edit or delete mandatory assignments
  v_ok := false;
  BEGIN
    INSERT INTO public.training_assignment_rules (organization_id, target_type, target_id, content_type, content_id, is_mandatory)
    VALUES (current_setting('t.org')::uuid, 'user', auth.uid()::text, 'module', current_setting('t.module')::uuid, false);
  EXCEPTION WHEN insufficient_privilege THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL C3: learner self-inserted an assignment'; END IF;

  UPDATE public.training_assignment_rules SET is_mandatory = false, is_active = false WHERE target_id = auth.uid()::text;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL C3: learner edited own assignment'; END IF;
  DELETE FROM public.training_assignment_rules WHERE target_id = auth.uid()::text;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL C3: learner deleted own assignment'; END IF;

  -- H1: answer keys are not readable
  SELECT count(*) INTO v_n FROM public.unified_question_options WHERE question_id = current_setting('t.q1')::uuid;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL H1: learner can read answer options'; END IF;
  SELECT count(*) INTO v_n FROM public.unified_questions WHERE id = current_setting('t.q1')::uuid;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL H1: learner can read question rows'; END IF;

  -- H1: per-question grading is not an oracle for a graded quiz
  v_ok := false;
  BEGIN
    PERFORM public.grade_question_attempt(current_setting('t.q1')::uuid, current_setting('t.q1_wrong'));
  EXCEPTION WHEN raise_exception THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL H1: grade_question_attempt revealed a graded quiz answer'; END IF;

  -- The player RPC still works and never exposes correctness
  IF jsonb_array_length(public.get_quiz_for_player(current_setting('t.quiz')::uuid) -> 'questions') <> 2 THEN
    RAISE EXCEPTION 'FAIL: get_quiz_for_player did not return the quiz';
  END IF;
  IF public.get_quiz_for_player(current_setting('t.quiz')::uuid)::text LIKE '%is_correct%' THEN
    RAISE EXCEPTION 'FAIL H1: get_quiz_for_player leaked is_correct';
  END IF;

  -- C2: a submission cannot be born approved nor self-approved
  INSERT INTO public.training_assignment_submissions (training_module_id, block_id, user_id, status, score, passed, submission_content)
  VALUES (current_setting('t.module')::uuid, current_setting('t.b_prac'), auth.uid(), 'approved', 100, true, 'my work');
  SELECT status INTO v_status FROM public.training_assignment_submissions WHERE user_id = auth.uid();
  IF v_status <> 'submitted' THEN RAISE EXCEPTION 'FAIL C2: submission inserted as %', v_status; END IF;

  v_ok := false;
  BEGIN
    UPDATE public.training_assignment_submissions SET status = 'approved', score = 100 WHERE user_id = auth.uid();
  EXCEPTION WHEN raise_exception THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL C2: learner self-approved a submission'; END IF;

  -- Progress row: completion fields cannot be forged
  -- A bogus assignment id from the client is dropped rather than failing the write.
  INSERT INTO public.training_progress (user_id, training_id, lp_content_type, status, passed, score_percentage, quiz_score, completed_at, assignment_id)
  VALUES (auth.uid(), current_setting('t.module')::uuid, 'module', 'completed', true, 100, 100, now(), gen_random_uuid());
  UPDATE public.training_progress SET status = 'completed', passed = true, quiz_score = 100, completed_at = now()
   WHERE user_id = auth.uid() AND training_id = current_setting('t.module')::uuid;
  SELECT count(*) INTO v_n FROM public.training_progress
   WHERE user_id = auth.uid() AND training_id = current_setting('t.module')::uuid
     AND (status = 'completed' OR passed IS NOT NULL OR quiz_score IS NOT NULL OR completed_at IS NOT NULL OR assignment_id IS NOT NULL);
  IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: learner forged training_progress completion fields'; END IF;

  -- Completion is refused while nothing is done
  v_ok := false;
  BEGIN
    PERFORM public.complete_training_module(current_setting('t.module')::uuid);
  EXCEPTION WHEN raise_exception THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: module completed with no work done'; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Outsider (other tenant) cannot load or submit this tenant's quiz
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.outsider'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_ok boolean;
BEGIN
  v_ok := false;
  BEGIN
    PERFORM public.get_quiz_for_player(current_setting('t.quiz')::uuid);
  EXCEPTION WHEN raise_exception THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: cross-tenant get_quiz_for_player'; END IF;

  v_ok := false;
  BEGIN
    PERFORM public.submit_quiz_attempt(current_setting('t.quiz')::uuid,
      jsonb_build_array(jsonb_build_object('question_id', current_setting('t.q1'), 'selected_answer', current_setting('t.q1_right'))));
  EXCEPTION WHEN raise_exception THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: cross-tenant submit_quiz_attempt'; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Learner: grading rules
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_res jsonb;
BEGIN
  -- Answering one question (correctly, three times) scores against the whole quiz.
  v_res := public.submit_quiz_attempt(current_setting('t.quiz')::uuid, jsonb_build_array(
    jsonb_build_object('question_id', current_setting('t.q1'), 'selected_answer', current_setting('t.q1_right')),
    jsonb_build_object('question_id', current_setting('t.q1'), 'selected_answer', current_setting('t.q1_right')),
    jsonb_build_object('question_id', current_setting('t.q1'), 'selected_answer', current_setting('t.q1_right'))));
  IF (v_res ->> 'score_percentage')::numeric <> 50 THEN
    RAISE EXCEPTION 'FAIL: partial/duplicate answers scored %', v_res ->> 'score_percentage';
  END IF;

  -- The player records content-block progress directly.
  INSERT INTO public.training_block_progress (user_id, training_module_id, block_id, completed_at)
  VALUES (auth.uid(), current_setting('t.module')::uuid, current_setting('t.b_text')::uuid, now());
END $$;

-- Manager approves the practical submission
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.manager'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_row record;
BEGIN
  UPDATE public.training_assignment_submissions
     SET status = 'approved', score = 90, submission_content = 'tampered', reviewed_by = NULL
   WHERE training_module_id = current_setting('t.module')::uuid
  RETURNING * INTO v_row;
  IF v_row.status <> 'approved' THEN RAISE EXCEPTION 'FAIL: reviewer could not approve'; END IF;
  IF v_row.submission_content <> 'my work' THEN RAISE EXCEPTION 'FAIL: reviewer rewrote learner content'; END IF;
  IF v_row.reviewed_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'FAIL: reviewed_by not stamped'; END IF;
END $$;

-- Learner finishes the module
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_ok boolean;
  v_res jsonb;
  v_cert record;
BEGIN
  -- Module passing score (80) is enforced over the 50%% quiz result.
  v_ok := false;
  BEGIN
    PERFORM public.complete_training_module(current_setting('t.module')::uuid);
  EXCEPTION WHEN raise_exception THEN
    v_ok := SQLERRM LIKE 'Module passing score not met%';
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL H2: module completed below its passing score'; END IF;

  v_res := public.submit_quiz_attempt(current_setting('t.quiz')::uuid, jsonb_build_array(
    jsonb_build_object('question_id', current_setting('t.q1'), 'selected_answer', current_setting('t.q1_right')),
    jsonb_build_object('question_id', current_setting('t.q2'), 'selected_answer', current_setting('t.q2_right'))));
  IF (v_res ->> 'score_percentage')::numeric <> 100 THEN RAISE EXCEPTION 'FAIL: full marks scored %', v_res ->> 'score_percentage'; END IF;

  v_res := public.complete_training_module(current_setting('t.module')::uuid);
  IF (v_res ->> 'passed')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: completion not passed'; END IF;

  SELECT * INTO v_cert FROM public.certificates
   WHERE user_id = auth.uid() AND training_module_id = current_setting('t.module')::uuid AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: no certificate issued'; END IF;
  -- average of quiz (100) and practical (90)
  IF v_cert.score IS DISTINCT FROM 95 THEN RAISE EXCEPTION 'FAIL H2: certificate score %', v_cert.score; END IF;
  IF v_cert.expiry_date IS NULL THEN RAISE EXCEPTION 'FAIL: certificate has no expiry'; END IF;
  PERFORM set_config('t.cert1', v_cert.id::text, true);
END $$;

-- ---------------------------------------------------------------------------
-- Recertification cycle
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_ok boolean;
BEGIN
  v_ok := false;
  BEGIN
    PERFORM public.start_recertification(auth.uid(), current_setting('t.module')::uuid);
  EXCEPTION WHEN raise_exception THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: learner started a recertification'; END IF;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.manager'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

SELECT public.start_recertification(current_setting('t.learner')::uuid, current_setting('t.module')::uuid);

RESET ROLE;
DO $$
DECLARE v_tp record;
BEGIN
  SELECT * INTO v_tp FROM public.training_progress
   WHERE user_id = current_setting('t.learner')::uuid AND training_id = current_setting('t.module')::uuid;
  IF v_tp.status <> 'not_started' OR v_tp.completed_at IS NOT NULL OR v_tp.cycle_started_at IS NULL THEN
    RAISE EXCEPTION 'FAIL H3: progress not reset (status %, completed_at %)', v_tp.status, v_tp.completed_at;
  END IF;
  IF (SELECT status FROM public.certificates WHERE id = current_setting('t.cert1')::uuid) <> 'superseded' THEN
    RAISE EXCEPTION 'FAIL H3: old certificate not superseded';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.training_completion_history
                  WHERE user_id = current_setting('t.learner')::uuid AND certificate_id = current_setting('t.cert1')::uuid) THEN
    RAISE EXCEPTION 'FAIL H3: completion not archived';
  END IF;
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_ok boolean;
  v_n integer;
BEGIN
  -- Previous cycle's quiz pass, practical approval and block progress no longer count.
  v_ok := false;
  BEGIN
    PERFORM public.complete_training_module(current_setting('t.module')::uuid);
  EXCEPTION WHEN raise_exception THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL H3: recertification completed from the previous cycle'; END IF;

  INSERT INTO public.training_block_progress (user_id, training_module_id, block_id, completed_at)
  VALUES (auth.uid(), current_setting('t.module')::uuid, current_setting('t.b_text')::uuid, now());
  PERFORM public.submit_quiz_attempt(current_setting('t.quiz')::uuid, jsonb_build_array(
    jsonb_build_object('question_id', current_setting('t.q1'), 'selected_answer', current_setting('t.q1_right')),
    jsonb_build_object('question_id', current_setting('t.q2'), 'selected_answer', current_setting('t.q2_right'))));
  INSERT INTO public.training_assignment_submissions (training_module_id, block_id, user_id, status, submission_content, attempt_number)
  VALUES (current_setting('t.module')::uuid, current_setting('t.b_prac'), auth.uid(), 'submitted', 'my work again', 2);
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.manager'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE public.training_assignment_submissions SET status = 'approved', score = 100
 WHERE training_module_id = current_setting('t.module')::uuid AND attempt_number = 2;

RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_n integer;
BEGIN
  PERFORM public.complete_training_module(current_setting('t.module')::uuid);
  SELECT count(*) INTO v_n FROM public.certificates
   WHERE user_id = auth.uid() AND training_module_id = current_setting('t.module')::uuid AND status = 'active';
  IF v_n <> 1 THEN RAISE EXCEPTION 'FAIL H3: expected one new active certificate after recertification, got %', v_n; END IF;
END $$;

RESET ROLE;
SELECT 'learning_integrity: all checks passed' AS result;

ROLLBACK;
