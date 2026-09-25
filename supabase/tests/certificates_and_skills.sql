-- Certificate issuance and skills isolation regression tests (Phase 0 hotfix,
-- rebuild audit 2026-09-25).
--
-- Self-contained: builds two tenants and their users inside a transaction,
-- impersonates each user through request.jwt.claims + the `authenticated`
-- role (exactly what PostgREST does) and ROLLS BACK at the end. Any failed
-- expectation raises and aborts the run.
--
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/certificates_and_skills.sql
--
-- Covers: forged certificates by content editors, learner quiz / path
-- certificates issued only when earned (and idempotently), manual issuance
-- rules (role, never self, recipient in org), and cross-tenant skills writes.

BEGIN;

-- ---------------------------------------------------------------------------
-- Fixtures (as the migration owner)
-- ---------------------------------------------------------------------------
SELECT set_config('t.org',      gen_random_uuid()::text, true),
       set_config('t.org2',     gen_random_uuid()::text, true),
       set_config('t.learner',  gen_random_uuid()::text, true),
       set_config('t.author',   gen_random_uuid()::text, true),
       set_config('t.manager',  gen_random_uuid()::text, true),
       set_config('t.outsider', gen_random_uuid()::text, true),
       set_config('t.module',   gen_random_uuid()::text, true),
       set_config('t.quiz',     gen_random_uuid()::text, true),
       set_config('t.path',     gen_random_uuid()::text, true),
       set_config('t.platform_skill', gen_random_uuid()::text, true);

INSERT INTO public.organizations (id, name, slug)
VALUES (current_setting('t.org')::uuid,  'Cert Test Org',   'cert-test-'  || left(current_setting('t.org'), 8)),
       (current_setting('t.org2')::uuid, 'Cert Other Org',  'cert-other-' || left(current_setting('t.org2'), 8));

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  (current_setting('t.learner')::uuid,  'learner-'  || left(current_setting('t.learner'), 8)  || '@cert.test',
   jsonb_build_object('organization_id', current_setting('t.org'),  'role', 'learner',          'full_name', 'Test Learner')),
  (current_setting('t.author')::uuid,   'author-'   || left(current_setting('t.author'), 8)   || '@cert.test',
   jsonb_build_object('organization_id', current_setting('t.org'),  'role', 'author',           'full_name', 'Test Author')),
  (current_setting('t.manager')::uuid,  'manager-'  || left(current_setting('t.manager'), 8)  || '@cert.test',
   jsonb_build_object('organization_id', current_setting('t.org'),  'role', 'training_manager', 'full_name', 'Test Manager')),
  (current_setting('t.outsider')::uuid, 'outsider-' || left(current_setting('t.outsider'), 8) || '@cert.test',
   jsonb_build_object('organization_id', current_setting('t.org2'), 'role', 'author',           'full_name', 'Other Tenant Author'));

INSERT INTO public.courses (id, organization_id, title, passing_score_percentage, certificate_enabled)
VALUES (current_setting('t.module')::uuid, current_setting('t.org')::uuid, 'Cert Module', 80, false);

INSERT INTO public.quizzes (id, organization_id, title, status, passing_score_percentage, created_by)
VALUES (current_setting('t.quiz')::uuid, current_setting('t.org')::uuid, 'Cert Quiz', 'published', 50,
        current_setting('t.manager')::uuid);

INSERT INTO public.training_paths (id, organization_id, title, path_type, certificate_enabled)
VALUES (current_setting('t.path')::uuid, current_setting('t.org')::uuid, 'Cert Path', 'custom', true);

INSERT INTO public.training_path_modules (organization_id, path_id, module_id, sequence, is_mandatory)
VALUES (current_setting('t.org')::uuid, current_setting('t.path')::uuid, current_setting('t.module')::uuid, 1, true);

INSERT INTO public.skills (id, name, category)
VALUES (current_setting('t.platform_skill')::uuid, 'Platform skill ' || left(current_setting('t.platform_skill'), 8), 'test');

-- ---------------------------------------------------------------------------
-- Author: cannot forge certificates, cannot issue by hand
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.author'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_ok boolean;
  v_n integer;
BEGIN
  v_ok := false;
  BEGIN
    INSERT INTO public.certificates (user_id, organization_id, recipient_name, certificate_type, certificate_number, verification_code, title, completion_date)
    VALUES (auth.uid(), current_setting('t.org')::uuid, 'Me', 'compliance', 'FORGED-1', 'FORGED1', 'Forged', now());
  EXCEPTION WHEN insufficient_privilege THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: author inserted a certificate directly'; END IF;

  v_ok := false;
  BEGIN
    UPDATE public.certificates SET score = 100 WHERE organization_id = current_setting('t.org')::uuid;
  EXCEPTION WHEN insufficient_privilege THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: author updated certificates directly'; END IF;

  v_ok := false;
  BEGIN
    PERFORM public.issue_manual_certificate(current_setting('t.org')::uuid, current_setting('t.learner')::uuid, 'compliance', 'x', now());
  EXCEPTION WHEN OTHERS THEN v_ok := SQLERRM LIKE '%not allowed%';
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: author issued a manual certificate'; END IF;

  -- Skills: an author's new skill lands in their own organization.
  INSERT INTO public.skills (name, category) VALUES ('Org A skill', 'test');
  SELECT count(*) INTO v_n FROM public.skills WHERE name = 'Org A skill' AND organization_id = current_setting('t.org')::uuid;
  IF v_n <> 1 THEN RAISE EXCEPTION 'FAIL: tenant skill was not scoped to the author''s organization'; END IF;

  -- ... and cannot touch the platform library.
  UPDATE public.skills SET name = name || ' (edited)' WHERE id = current_setting('t.platform_skill')::uuid;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: tenant author edited a platform skill'; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Other tenant: cannot see or change org A's skills
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.outsider'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_n integer;
  v_ok boolean;
BEGIN
  SELECT count(*) INTO v_n FROM public.skills WHERE name = 'Org A skill';
  IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: other tenant can see org A skills'; END IF;

  UPDATE public.skills SET name = 'hijacked' WHERE name = 'Org A skill';
  DELETE FROM public.skills WHERE name = 'Org A skill';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: other tenant deleted org A skill'; END IF;

  v_ok := false;
  BEGIN
    INSERT INTO public.skills (name, organization_id) VALUES ('planted', current_setting('t.org')::uuid);
  EXCEPTION WHEN insufficient_privilege THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: other tenant planted a skill in org A'; END IF;

  SELECT count(*) INTO v_n FROM public.skills WHERE id = current_setting('t.platform_skill')::uuid;
  IF v_n <> 1 THEN RAISE EXCEPTION 'FAIL: platform skills are not readable by tenants'; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Learner: quiz and path certificates only when earned
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_ok boolean;
BEGIN
  v_ok := false;
  BEGIN
    PERFORM public.issue_quiz_certificate(current_setting('t.quiz')::uuid);
  EXCEPTION WHEN OTHERS THEN v_ok := SQLERRM LIKE 'No passed attempt%';
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: quiz certificate issued without a passed attempt'; END IF;

  v_ok := false;
  BEGIN
    PERFORM public.issue_path_certificate(current_setting('t.path')::uuid);
  EXCEPTION WHEN OTHERS THEN v_ok := SQLERRM LIKE '%not yet passed%';
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: path certificate issued before the path was completed'; END IF;
END $$;

-- The learner passes the quiz and the path's course (trusted writes, as the
-- grading and completion RPCs would do).
RESET ROLE;
SELECT set_config('app.trusted_progress_write', 'on', true);
INSERT INTO public.unified_quiz_sessions (user_id, organization_id, quiz_type, quiz_entity_id, completed_at, passed, score_percentage)
VALUES (current_setting('t.learner')::uuid, current_setting('t.org')::uuid, 'learning_quiz', current_setting('t.quiz')::uuid, now(), true, 90);
INSERT INTO public.training_progress (user_id, organization_id, training_id, lp_content_type, status, passed, completed_at, score_percentage)
VALUES (current_setting('t.learner')::uuid, current_setting('t.org')::uuid, current_setting('t.module')::uuid, 'module', 'completed', true, now(), 85);
SELECT set_config('app.trusted_progress_write', 'off', true);

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_cert public.certificates;
  v_n integer;
BEGIN
  v_cert := public.issue_quiz_certificate(current_setting('t.quiz')::uuid);
  IF v_cert.certificate_type <> 'sop_quiz' OR v_cert.user_id <> auth.uid() OR v_cert.score <> 90 THEN
    RAISE EXCEPTION 'FAIL: quiz certificate has wrong type/owner/score';
  END IF;
  PERFORM public.issue_quiz_certificate(current_setting('t.quiz')::uuid);
  SELECT count(*) INTO v_n FROM public.certificates
   WHERE user_id = auth.uid() AND status = 'active' AND metadata ->> 'quiz_id' = current_setting('t.quiz');
  IF v_n <> 1 THEN RAISE EXCEPTION 'FAIL: quiz certificate issuance is not idempotent (% rows)', v_n; END IF;

  v_cert := public.issue_path_certificate(current_setting('t.path')::uuid);
  IF v_cert.certificate_type <> 'achievement' OR v_cert.score <> 85 THEN
    RAISE EXCEPTION 'FAIL: path certificate has wrong type/score';
  END IF;

  -- A learner still cannot issue certificates by hand.
  BEGIN
    PERFORM public.issue_manual_certificate(current_setting('t.org')::uuid, current_setting('t.learner')::uuid, 'compliance', 'x', now());
    RAISE EXCEPTION 'FAIL: learner issued a manual certificate';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- ---------------------------------------------------------------------------
-- Training manager: manual issuance rules
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.manager'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_cert public.certificates;
  v_hint text;
BEGIN
  BEGIN
    PERFORM public.issue_manual_certificate(current_setting('t.org')::uuid, auth.uid(), 'compliance', 'Self', now());
    RAISE EXCEPTION 'FAIL: manager issued a certificate to themselves';
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'CERT_SELF_ISSUE' THEN RAISE EXCEPTION 'FAIL: self-issue returned hint %', v_hint; END IF;
  END;

  BEGIN
    PERFORM public.issue_manual_certificate(current_setting('t.org')::uuid, current_setting('t.outsider')::uuid, 'compliance', 'x', now());
    RAISE EXCEPTION 'FAIL: manager certified a member of another organization';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'CERT_RECIPIENT_NOT_MEMBER' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.issue_manual_certificate(current_setting('t.org2')::uuid, current_setting('t.outsider')::uuid, 'compliance', 'x', now());
    RAISE EXCEPTION 'FAIL: manager issued into another organization';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM public.issue_manual_certificate(current_setting('t.org')::uuid, current_setting('t.learner')::uuid, 'compliance', 'x', now() + interval '7 days');
    RAISE EXCEPTION 'FAIL: manager back-dated a certificate into the future';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  v_cert := public.issue_manual_certificate(
    current_setting('t.org')::uuid, current_setting('t.learner')::uuid, 'training', 'Classroom delivery',
    now() - interval '1 day', NULL, current_setting('t.module')::uuid);
  IF v_cert.issued_by <> auth.uid() OR v_cert.metadata ->> 'source' <> 'manual'
     OR v_cert.training_module_id <> current_setting('t.module')::uuid THEN
    RAISE EXCEPTION 'FAIL: manual certificate is not attributed to its issuer';
  END IF;
END $$;

RESET ROLE;
ROLLBACK;
