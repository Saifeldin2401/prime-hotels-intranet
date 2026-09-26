-- Business rules regression tests (Phase 4, rebuild 2026-09-25).
--
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/business_rules.sql
--
-- Covers:
-- 1. Four-eyes course approval (creator cannot self-approve when other reviewers exist)
-- 2. Non-reviewers (authors, learners) cannot approve courses
-- 3. Unlinked and empty quizzes block approval
-- 4. Draft courses cannot be approved or assigned
-- 5. Knowledge publishing: learner blocked, cross-tenant supersede/dept blocked, caller attribution enforced
-- 6. Server-side department compliance: role-gated (reports.view)
-- 7. Manage risk queue: managers of the organization only
-- 8. Organization setup gaps and platform exceptions: scoped to admins / operators

BEGIN;

-- Setup test IDs
SELECT set_config('t.org',          gen_random_uuid()::text, true),
       set_config('t.org2',         gen_random_uuid()::text, true),
       set_config('t.org_single',   gen_random_uuid()::text, true),
       set_config('t.owner',        gen_random_uuid()::text, true),
       set_config('t.tm',           gen_random_uuid()::text, true),
       set_config('t.author',       gen_random_uuid()::text, true),
       set_config('t.learner',      gen_random_uuid()::text, true),
       set_config('t.sole_reviewer', gen_random_uuid()::text, true),
       set_config('t.course_tm',    gen_random_uuid()::text, true),
       set_config('t.course',       gen_random_uuid()::text, true),
       set_config('t.course_unlinked', gen_random_uuid()::text, true),
       set_config('t.course_empty_quiz', gen_random_uuid()::text, true),
       set_config('t.draft_course', gen_random_uuid()::text, true),
       set_config('t.single_course', gen_random_uuid()::text, true),
       set_config('t.quiz_empty',   gen_random_uuid()::text, true),
       set_config('t.doc1',         gen_random_uuid()::text, true),
       set_config('t.doc2',         gen_random_uuid()::text, true),
       set_config('t.dept2',        gen_random_uuid()::text, true);

-- Organizations
INSERT INTO public.organizations (id, name, slug)
VALUES (current_setting('t.org')::uuid,        'Biz Test Org',    'biz-t-' || left(current_setting('t.org'), 8)),
       (current_setting('t.org2')::uuid,       'Biz Other Org',   'biz-o-' || left(current_setting('t.org2'), 8)),
       (current_setting('t.org_single')::uuid, 'Biz Single Org',  'biz-s-' || left(current_setting('t.org_single'), 8));

-- Users
INSERT INTO auth.users (id, email, raw_user_meta_data)
SELECT u.id::uuid, u.email, jsonb_build_object('organization_id', u.org, 'role', u.role, 'full_name', u.email)
  FROM (VALUES
    (current_setting('t.owner'),         'owner-'   || left(current_setting('t.owner'), 8)   || '@biz.test', current_setting('t.org'), 'organization_owner'),
    (current_setting('t.tm'),            'tm-'      || left(current_setting('t.tm'), 8)      || '@biz.test', current_setting('t.org'), 'training_manager'),
    (current_setting('t.author'),        'author-'  || left(current_setting('t.author'), 8)  || '@biz.test', current_setting('t.org'), 'author'),
    (current_setting('t.learner'),       'learner-' || left(current_setting('t.learner'), 8) || '@biz.test', current_setting('t.org'), 'learner'),
    (current_setting('t.sole_reviewer'), 'sole-'    || left(current_setting('t.sole_reviewer'), 8) || '@biz.test', current_setting('t.org_single'), 'training_manager')
  ) AS u(id, email, org, role);

-- Courses
INSERT INTO public.courses (id, organization_id, title, status, created_by)
VALUES (current_setting('t.course_tm')::uuid, current_setting('t.org')::uuid, 'TM Own Course', 'pending_review', current_setting('t.tm')::uuid),
       (current_setting('t.course')::uuid, current_setting('t.org')::uuid, 'Author Course to Approve', 'pending_review', current_setting('t.author')::uuid),
       (current_setting('t.course_unlinked')::uuid, current_setting('t.org')::uuid, 'Course Unlinked Quiz', 'pending_review', current_setting('t.author')::uuid),
       (current_setting('t.course_empty_quiz')::uuid, current_setting('t.org')::uuid, 'Course Empty Quiz', 'pending_review', current_setting('t.author')::uuid),
       (current_setting('t.draft_course')::uuid, current_setting('t.org')::uuid, 'Draft Course', 'draft', current_setting('t.author')::uuid),
       (current_setting('t.single_course')::uuid, current_setting('t.org_single')::uuid, 'Single Org Course', 'pending_review', current_setting('t.sole_reviewer')::uuid);

-- Empty quiz
INSERT INTO public.quizzes (id, organization_id, title, status, created_by)
VALUES (current_setting('t.quiz_empty')::uuid, current_setting('t.org')::uuid, 'Empty Quiz', 'published', current_setting('t.author')::uuid);

-- Lessons (blocks)
INSERT INTO public.lessons (id, organization_id, training_module_id, block_order, title, block_type, is_mandatory, content_data)
VALUES (gen_random_uuid(), current_setting('t.org')::uuid, current_setting('t.course_unlinked')::uuid, 1, 'Quiz Block', 'quiz', true, '{"quiz_id": null}'::jsonb),
       (gen_random_uuid(), current_setting('t.org')::uuid, current_setting('t.course_empty_quiz')::uuid, 1, 'Quiz Block', 'quiz', true, jsonb_build_object('quiz_id', current_setting('t.quiz_empty')));

-- Documents & Departments
INSERT INTO public.documents (id, organization_id, title, status, content, created_by)
VALUES (current_setting('t.doc1')::uuid, current_setting('t.org')::uuid, 'Article 1', 'DRAFT', 'Content 1', current_setting('t.author')::uuid),
       (current_setting('t.doc2')::uuid, current_setting('t.org2')::uuid, 'Article 2 Org 2', 'PUBLISHED', 'Content 2', current_setting('t.author')::uuid);

INSERT INTO public.departments (id, organization_id, name)
VALUES (current_setting('t.dept2')::uuid, current_setting('t.org2')::uuid, 'Dept Org 2');

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_hint text;
  v_res jsonb;
BEGIN
  -- 1. Four-eyes: TM creates course, attempts self-approval while owner exists -> fails with COURSE_SELF_APPROVAL
  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.tm'), 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.approve_training_module(current_setting('t.course_tm')::uuid);
    RAISE EXCEPTION 'FAIL: TM self-approved course!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF SQLSTATE <> '42501' THEN RAISE EXCEPTION 'FAIL: Expected 42501, got %: %', SQLSTATE, SQLERRM; END IF;
    IF v_hint <> 'COURSE_SELF_APPROVAL' THEN RAISE EXCEPTION 'FAIL: Expected COURSE_SELF_APPROVAL hint, got %', v_hint; END IF;
  END;

  -- Non-reviewer author cannot approve course
  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.author'), 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.approve_training_module(current_setting('t.course')::uuid);
    RAISE EXCEPTION 'FAIL: Author approved course!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF SQLSTATE <> '42501' THEN RAISE EXCEPTION 'FAIL: Expected 42501 for author, got %: %', SQLSTATE, SQLERRM; END IF;
    IF v_hint <> 'COURSE_REVIEW_NOT_ALLOWED' THEN RAISE EXCEPTION 'FAIL: Expected COURSE_REVIEW_NOT_ALLOWED hint, got %', v_hint; END IF;
  END;

  -- Learner cannot approve course
  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.approve_training_module(current_setting('t.course')::uuid);
    RAISE EXCEPTION 'FAIL: Learner approved course!';
  EXCEPTION WHEN others THEN
    IF SQLSTATE <> '42501' THEN RAISE EXCEPTION 'FAIL: Expected 42501 for learner, got %: %', SQLSTATE, SQLERRM; END IF;
  END;

  -- TM tries to approve course with unlinked quiz block
  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.tm'), 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.approve_training_module(current_setting('t.course_unlinked')::uuid);
    RAISE EXCEPTION 'FAIL: Approved course with unlinked quiz!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'COURSE_QUIZ_NOT_LINKED' THEN RAISE EXCEPTION 'FAIL: Expected COURSE_QUIZ_NOT_LINKED hint, got %', v_hint; END IF;
  END;

  -- TM tries to approve course with empty quiz (0 published questions)
  BEGIN
    PERFORM public.approve_training_module(current_setting('t.course_empty_quiz')::uuid);
    RAISE EXCEPTION 'FAIL: Approved course with empty quiz!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'COURSE_QUIZ_EMPTY' THEN RAISE EXCEPTION 'FAIL: Expected COURSE_QUIZ_EMPTY hint, got %', v_hint; END IF;
  END;

  -- Draft course cannot be approved (must be pending_review)
  BEGIN
    PERFORM public.approve_training_module(current_setting('t.draft_course')::uuid);
    RAISE EXCEPTION 'FAIL: Approved draft course!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'COURSE_NOT_PENDING_REVIEW' THEN RAISE EXCEPTION 'FAIL: Expected COURSE_NOT_PENDING_REVIEW hint, got %', v_hint; END IF;
  END;

  -- TM approves legitimate pending course created by author -> succeeds
  PERFORM public.approve_training_module(current_setting('t.course')::uuid);
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = current_setting('t.course')::uuid AND status = 'published') THEN
    RAISE EXCEPTION 'FAIL: Course not published after TM approval!';
  END IF;

  -- Single-reviewer organization: creator is sole reviewer -> can self-approve
  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.sole_reviewer'), 'role', 'authenticated')::text, true);
  PERFORM public.approve_training_module(current_setting('t.single_course')::uuid);
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = current_setting('t.single_course')::uuid AND status = 'published') THEN
    RAISE EXCEPTION 'FAIL: Sole reviewer could not approve course!';
  END IF;

  -- 2. Knowledge publishing checks
  -- Learner cannot publish
  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.publish_document_to_kb(current_setting('t.doc1')::uuid, current_setting('t.learner')::uuid);
    RAISE EXCEPTION 'FAIL: Learner published document!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF SQLSTATE <> '42501' THEN RAISE EXCEPTION 'FAIL: Expected 42501 on learner publish, got %: %', SQLSTATE, SQLERRM; END IF;
    IF v_hint <> 'KB_PUBLISH_NOT_ALLOWED' THEN RAISE EXCEPTION 'FAIL: Expected KB_PUBLISH_NOT_ALLOWED hint, got %', v_hint; END IF;
  END;

  -- Cross-tenant supersede attempt
  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.owner'), 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.publish_document_to_kb(current_setting('t.doc1')::uuid, current_setting('t.owner')::uuid, 'all_properties', NULL, NULL, current_setting('t.doc2')::uuid);
    RAISE EXCEPTION 'FAIL: Superseded doc from another org!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'KB_SUPERSEDE_OTHER_ORG' THEN RAISE EXCEPTION 'FAIL: Expected KB_SUPERSEDE_OTHER_ORG hint, got %', v_hint; END IF;
  END;

  -- Cross-tenant department attempt
  BEGIN
    PERFORM public.publish_document_to_kb(current_setting('t.doc1')::uuid, current_setting('t.owner')::uuid, 'all_properties', NULL, current_setting('t.dept2')::uuid, NULL);
    RAISE EXCEPTION 'FAIL: Set department from another org!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'KB_DEPARTMENT_OTHER_ORG' THEN RAISE EXCEPTION 'FAIL: Expected KB_DEPARTMENT_OTHER_ORG hint, got %', v_hint; END IF;
  END;

  -- Legitimate publish by author -> caller is publisher
  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.author'), 'role', 'authenticated')::text, true);
  v_res := public.publish_document_to_kb(current_setting('t.doc1')::uuid, current_setting('t.learner')::uuid);
  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: Publish failed: %', v_res;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.documents
     WHERE id = current_setting('t.doc1')::uuid
       AND status = 'PUBLISHED'
       AND published_by = current_setting('t.author')::uuid
  ) THEN
    RAISE EXCEPTION 'FAIL: Document not published with correct author attribution!';
  END IF;

  -- 3. Course assignment checks
  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.tm'), 'role', 'authenticated')::text, true);
  -- Draft course cannot be assigned
  BEGIN
    PERFORM public.create_scoped_training_assignment(
      p_course_id => current_setting('t.draft_course')::uuid,
      p_scope_type => 'individual',
      p_organization_id => current_setting('t.org')::uuid,
      p_target_user_ids => ARRAY[current_setting('t.learner')::uuid]
    );
    RAISE EXCEPTION 'FAIL: Draft course was assigned!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'ASSIGN_COURSE_NOT_PUBLISHED' THEN
      RAISE EXCEPTION 'FAIL: Expected ASSIGN_COURSE_NOT_PUBLISHED hint, got %', v_hint;
    END IF;
  END;

  -- Published course assignment succeeds
  PERFORM public.create_scoped_training_assignment(
    p_course_id => current_setting('t.course')::uuid,
    p_scope_type => 'individual',
    p_organization_id => current_setting('t.org')::uuid,
    p_target_user_ids => ARRAY[current_setting('t.learner')::uuid]
  );

  -- 4. Department compliance checks
  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM * FROM public.get_department_compliance(current_setting('t.org')::uuid);
    RAISE EXCEPTION 'FAIL: Learner accessed department compliance!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'REPORTS_NOT_ALLOWED' THEN
      RAISE EXCEPTION 'FAIL: Expected REPORTS_NOT_ALLOWED hint, got %', v_hint;
    END IF;
  END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.tm'), 'role', 'authenticated')::text, true);
  PERFORM * FROM public.get_department_compliance(current_setting('t.org')::uuid);

  -- 5. Manage risk queue: managers only, own organization only
  PERFORM * FROM public.get_risk_queue(current_setting('t.org')::uuid);
  BEGIN
    PERFORM * FROM public.get_risk_queue(current_setting('t.org2')::uuid);
    RAISE EXCEPTION 'FAIL: Training manager read another organization''s risk queue!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'REPORTS_NOT_ALLOWED' THEN
      RAISE EXCEPTION 'FAIL: Expected REPORTS_NOT_ALLOWED hint for cross-org risk queue, got %', v_hint;
    END IF;
  END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.learner'), 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM * FROM public.get_risk_queue(current_setting('t.org')::uuid);
    RAISE EXCEPTION 'FAIL: Learner read the risk queue!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'REPORTS_NOT_ALLOWED' THEN
      RAISE EXCEPTION 'FAIL: Expected REPORTS_NOT_ALLOWED hint for learner risk queue, got %', v_hint;
    END IF;
  END;

  -- 6. Organization setup gaps: org admins / people managers only
  BEGIN
    PERFORM * FROM public.get_org_setup_gaps(current_setting('t.org')::uuid);
    RAISE EXCEPTION 'FAIL: Learner read organization setup gaps!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'ORG_ADMIN_REQUIRED' THEN
      RAISE EXCEPTION 'FAIL: Expected ORG_ADMIN_REQUIRED for learner setup gaps, got %', v_hint;
    END IF;
  END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('t.owner'), 'role', 'authenticated')::text, true);
  PERFORM * FROM public.get_org_setup_gaps(current_setting('t.org')::uuid);
  BEGIN
    PERFORM * FROM public.get_org_setup_gaps(current_setting('t.org2')::uuid);
    RAISE EXCEPTION 'FAIL: Owner read another organization''s setup gaps!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'ORG_ADMIN_REQUIRED' THEN
      RAISE EXCEPTION 'FAIL: Expected ORG_ADMIN_REQUIRED for cross-org setup gaps, got %', v_hint;
    END IF;
  END;

  -- 7. Platform exceptions: never for tenant roles, however senior
  BEGIN
    PERFORM * FROM public.get_platform_exceptions();
    RAISE EXCEPTION 'FAIL: Organization owner read platform exceptions!';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'PLATFORM_OPERATOR_REQUIRED' THEN
      RAISE EXCEPTION 'FAIL: Expected PLATFORM_OPERATOR_REQUIRED, got %', v_hint;
    END IF;
  END;
END $$;

RESET ROLE;
SELECT 'business rules: all checks passed' AS result;

ROLLBACK;
