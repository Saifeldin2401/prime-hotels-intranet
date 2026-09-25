-- Lessons table regression tests (Phase 2c, 2026-09-25).
--
-- Self-contained: builds two tenants, a published and a draft course with
-- lessons, impersonates users the way PostgREST does and ROLLS BACK.
--
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/lessons.sql
--
-- Covers: learners read lessons of published courses only and cannot write;
-- other tenants can neither read nor plant lessons; course editors can edit;
-- duplicate_training_module copies lessons; completion + certificate still
-- work over the lessons table; deleting a course leaves no orphan lessons.

BEGIN;

SELECT set_config('t.org',      gen_random_uuid()::text, true),
       set_config('t.org2',     gen_random_uuid()::text, true),
       set_config('t.learner',  gen_random_uuid()::text, true),
       set_config('t.manager',  gen_random_uuid()::text, true),
       set_config('t.outsider', gen_random_uuid()::text, true),
       set_config('t.module',   gen_random_uuid()::text, true),
       set_config('t.draft',    gen_random_uuid()::text, true),
       set_config('t.quiz',     gen_random_uuid()::text, true),
       set_config('t.q1',       gen_random_uuid()::text, true),
       set_config('t.q2',       gen_random_uuid()::text, true),
       set_config('t.q1_right', gen_random_uuid()::text, true),
       set_config('t.q2_right', gen_random_uuid()::text, true),
       set_config('t.b_text',   gen_random_uuid()::text, true),
       set_config('t.b_quiz',   gen_random_uuid()::text, true),
       set_config('t.b_prac',   gen_random_uuid()::text, true);

INSERT INTO public.organizations (id, name, slug)
VALUES (current_setting('t.org')::uuid,  'Lessons Test Org',  'lessons-test-' || left(current_setting('t.org'), 8)),
       (current_setting('t.org2')::uuid, 'Lessons Other Org', 'lessons-other-' || left(current_setting('t.org2'), 8));

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  (current_setting('t.learner')::uuid,  'learner-'  || left(current_setting('t.learner'), 8)  || '@lessons.test',
   jsonb_build_object('organization_id', current_setting('t.org'),  'role', 'learner',          'full_name', 'Learner')),
  (current_setting('t.manager')::uuid,  'manager-'  || left(current_setting('t.manager'), 8)  || '@lessons.test',
   jsonb_build_object('organization_id', current_setting('t.org'),  'role', 'training_manager', 'full_name', 'Manager')),
  (current_setting('t.outsider')::uuid, 'outsider-' || left(current_setting('t.outsider'), 8) || '@lessons.test',
   jsonb_build_object('organization_id', current_setting('t.org2'), 'role', 'author',           'full_name', 'Outsider'));

INSERT INTO public.courses (id, organization_id, title, status, passing_score_percentage, certificate_enabled, validity_period_days)
VALUES (current_setting('t.module')::uuid, current_setting('t.org')::uuid, 'Lessons Module', 'published', 80, true, 365),
       (current_setting('t.draft')::uuid,  current_setting('t.org')::uuid, 'Draft Module', 'draft', 80, false, null);

INSERT INTO public.quizzes (id, organization_id, title, status, passing_score_percentage, created_by)
VALUES (current_setting('t.quiz')::uuid, current_setting('t.org')::uuid, 'Lessons Quiz', 'published', 50, current_setting('t.manager')::uuid);

INSERT INTO public.unified_questions (id, organization_id, question_text, question_type, status, created_by)
VALUES (current_setting('t.q1')::uuid, current_setting('t.org')::uuid, 'Q1?', 'mcq', 'published', current_setting('t.manager')::uuid),
       (current_setting('t.q2')::uuid, current_setting('t.org')::uuid, 'Q2?', 'mcq', 'published', current_setting('t.manager')::uuid);

INSERT INTO public.unified_question_options (id, organization_id, question_id, option_text, is_correct, display_order)
VALUES (current_setting('t.q1_right')::uuid, current_setting('t.org')::uuid, current_setting('t.q1')::uuid, 'right', true, 1),
       (current_setting('t.q2_right')::uuid, current_setting('t.org')::uuid, current_setting('t.q2')::uuid, 'right', true, 1);

INSERT INTO public.unified_quiz_questions (organization_id, quiz_id, question_id, display_order)
VALUES (current_setting('t.org')::uuid, current_setting('t.quiz')::uuid, current_setting('t.q1')::uuid, 1),
       (current_setting('t.org')::uuid, current_setting('t.quiz')::uuid, current_setting('t.q2')::uuid, 2);

INSERT INTO public.lessons (id, organization_id, title, training_module_id, block_type, block_order, is_mandatory, content_data)
VALUES
  (current_setting('t.b_text')::uuid, current_setting('t.org')::uuid, 'Read me', current_setting('t.module')::uuid, 'text', 1, true, '{}'::jsonb),
  (current_setting('t.b_quiz')::uuid, current_setting('t.org')::uuid, 'Check',   current_setting('t.module')::uuid, 'quiz', 2, true,
   jsonb_build_object('quiz_id', current_setting('t.quiz'))),
  (current_setting('t.b_prac')::uuid, current_setting('t.org')::uuid, 'Do it',   current_setting('t.module')::uuid, 'practical', 3, true, '{}'::jsonb),
  (gen_random_uuid(),                current_setting('t.org')::uuid, 'Draft',   current_setting('t.draft')::uuid, 'text', 1, true, '{}'::jsonb);

-- ---------------------------------------------------------------------------
-- Learner
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_ok boolean; v_n integer; v_msg text;
BEGIN
  SELECT count(*) INTO v_n FROM public.lessons WHERE training_module_id = current_setting('t.module')::uuid;
  IF v_n <> 3 THEN RAISE EXCEPTION 'FAIL: learner sees % lessons of a published course (expected 3)', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.lessons WHERE training_module_id = current_setting('t.draft')::uuid;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: learner reads draft course lessons'; END IF;

  v_ok := false;
  BEGIN
    INSERT INTO public.lessons (organization_id, title, training_module_id, block_type)
    VALUES (current_setting('t.org')::uuid, 'x', current_setting('t.module')::uuid, 'text');
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    v_ok := v_msg LIKE '%row-level security%';
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: learner lesson insert not blocked by RLS (%)', v_msg; END IF;

  UPDATE public.lessons SET title = 'hacked' WHERE training_module_id = current_setting('t.module')::uuid;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: learner edited lessons'; END IF;

  INSERT INTO public.training_assignment_submissions (training_module_id, block_id, user_id, status, submission_content)
  VALUES (current_setting('t.module')::uuid, current_setting('t.b_prac'), auth.uid(), 'submitted', 'my work');
  PERFORM public.submit_quiz_attempt(current_setting('t.quiz')::uuid, jsonb_build_array(
    jsonb_build_object('question_id', current_setting('t.q1'), 'selected_answer', current_setting('t.q1_right')),
    jsonb_build_object('question_id', current_setting('t.q2'), 'selected_answer', current_setting('t.q2_right'))));
  INSERT INTO public.lesson_progress (user_id, training_module_id, block_id, completed_at)
  VALUES (auth.uid(), current_setting('t.module')::uuid, current_setting('t.b_text')::uuid, now());
END $$;

-- ---------------------------------------------------------------------------
-- Other tenant
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.outsider'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_n integer; v_ok boolean := false; v_msg text;
BEGIN
  SELECT count(*) INTO v_n FROM public.lessons WHERE organization_id = current_setting('t.org')::uuid;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: other tenant reads % lessons', v_n; END IF;
  BEGIN
    INSERT INTO public.lessons (organization_id, title, training_module_id, block_type)
    VALUES (current_setting('t.org')::uuid, 'x', current_setting('t.module')::uuid, 'text');
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    v_ok := v_msg LIKE '%row-level security%';
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: other tenant insert not blocked by RLS (%)', v_msg; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Training manager
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.manager'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

UPDATE public.training_assignment_submissions SET status = 'approved', score = 90
 WHERE training_module_id = current_setting('t.module')::uuid;

DO $$
DECLARE v_new uuid; v_n integer;
BEGIN
  UPDATE public.lessons SET title = 'Read me (edited)' WHERE id = current_setting('t.b_text')::uuid;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN RAISE EXCEPTION 'FAIL: training manager cannot edit lessons'; END IF;

  INSERT INTO public.lessons (title, training_module_id, block_type, block_order)
  VALUES ('Extra', current_setting('t.module')::uuid, 'text', 9);
  DELETE FROM public.lessons WHERE title = 'Extra' AND training_module_id = current_setting('t.module')::uuid;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN RAISE EXCEPTION 'FAIL: training manager cannot insert/delete lessons'; END IF;

  v_new := public.duplicate_training_module(current_setting('t.module')::uuid);
  SELECT count(*) INTO v_n FROM public.lessons WHERE training_module_id = v_new;
  IF v_n <> 3 THEN RAISE EXCEPTION 'FAIL: duplicate copied % lessons', v_n; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Completion over lessons
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_res jsonb; v_cert record;
BEGIN
  v_res := public.complete_training_module(current_setting('t.module')::uuid);
  IF (v_res ->> 'passed')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: completion not passed: %', v_res; END IF;
  SELECT * INTO v_cert FROM public.certificates
   WHERE user_id = auth.uid() AND training_module_id = current_setting('t.module')::uuid AND status = 'active';
  IF NOT FOUND OR v_cert.score IS DISTINCT FROM 95 THEN RAISE EXCEPTION 'FAIL: certificate missing or wrong score'; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Deleting a course removes its lessons
-- ---------------------------------------------------------------------------
RESET ROLE;
DO $$
DECLARE v_n integer;
BEGIN
  DELETE FROM public.courses WHERE id = current_setting('t.draft')::uuid;
  SELECT count(*) INTO v_n FROM public.lessons WHERE training_module_id = current_setting('t.draft')::uuid;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: deleting a course left % orphan lessons', v_n; END IF;
END $$;

SELECT 'lessons: all checks passed' AS result;

ROLLBACK;
