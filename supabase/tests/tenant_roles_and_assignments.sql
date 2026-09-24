-- Tenant roles, assignment model and analytics scoping regression tests.
--
-- Same harness as learning_integrity.sql: self-contained fixtures, impersonation
-- via request.jwt.claims + the authenticated role, ROLLBACK at the end.
--
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/tenant_roles_and_assignments.sql
--
-- Covers: roles derived from organization_memberships (user_roles view),
-- process_employee_transfer privilege escalation, new-hire auto-assignment,
-- tenant-scoped analytics and the module review workflow.

BEGIN;

SELECT set_config('t.org_a',    gen_random_uuid()::text, true),
       set_config('t.org_b',    gen_random_uuid()::text, true),
       set_config('t.a_admin',  gen_random_uuid()::text, true),
       set_config('t.a_tm',     gen_random_uuid()::text, true),
       set_config('t.a_learn',  gen_random_uuid()::text, true),
       set_config('t.a_hire',   gen_random_uuid()::text, true),
       set_config('t.b_admin',  gen_random_uuid()::text, true),
       set_config('t.module',   gen_random_uuid()::text, true),
       set_config('t.module2',  gen_random_uuid()::text, true);

INSERT INTO public.organizations (id, name, slug)
VALUES (current_setting('t.org_a')::uuid, 'Roles Test A', 'roles-test-a-' || left(current_setting('t.org_a'), 8)),
       (current_setting('t.org_b')::uuid, 'Roles Test B', 'roles-test-b-' || left(current_setting('t.org_b'), 8));

INSERT INTO auth.users (id, email, raw_user_meta_data)
SELECT u.id::uuid, u.email, jsonb_build_object('organization_id', u.org, 'role', u.role, 'full_name', u.email)
  FROM (VALUES
    (current_setting('t.a_admin'), 'a-admin-' || left(current_setting('t.a_admin'), 8) || '@roles.test', current_setting('t.org_a'), 'organization_admin'),
    (current_setting('t.a_tm'),    'a-tm-'    || left(current_setting('t.a_tm'), 8)    || '@roles.test', current_setting('t.org_a'), 'training_manager'),
    (current_setting('t.a_learn'), 'a-learn-' || left(current_setting('t.a_learn'), 8) || '@roles.test', current_setting('t.org_a'), 'learner'),
    (current_setting('t.b_admin'), 'b-admin-' || left(current_setting('t.b_admin'), 8) || '@roles.test', current_setting('t.org_b'), 'organization_admin')
  ) AS u(id, email, org, role);

INSERT INTO public.training_modules (id, organization_id, title, status)
VALUES (current_setting('t.module')::uuid,  current_setting('t.org_a')::uuid, 'Roles Module',  'published'),
       (current_setting('t.module2')::uuid, current_setting('t.org_a')::uuid, 'Review Module', 'pending_review');

-- One standing (audience) rule and one individual assignment in org A.
INSERT INTO public.training_assignment_rules (organization_id, target_type, target_id, content_type, content_id, training_module_id, scope_type, is_active, status)
VALUES (current_setting('t.org_a')::uuid, 'everyone', NULL, 'module', current_setting('t.module')::uuid, current_setting('t.module')::uuid, 'organization', true, 'active'),
       (current_setting('t.org_a')::uuid, 'user', current_setting('t.a_learn'), 'module', current_setting('t.module2')::uuid, current_setting('t.module2')::uuid, 'individual', true, 'active');

-- ---------------------------------------------------------------------------
-- Roles come from memberships, per organization
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles
                  WHERE user_id = current_setting('t.a_admin')::uuid AND role = 'administrator'
                    AND organization_id = current_setting('t.org_a')::uuid) THEN
    RAISE EXCEPTION 'FAIL: org admin is not an administrator in their org';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles
              WHERE user_id = current_setting('t.a_admin')::uuid AND organization_id = current_setting('t.org_b')::uuid) THEN
    RAISE EXCEPTION 'FAIL: org A admin holds a role in org B';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- New hire: gets standing rules, never other people's individual assignments
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (current_setting('t.a_hire')::uuid, 'a-hire-' || left(current_setting('t.a_hire'), 8) || '@roles.test',
        jsonb_build_object('organization_id', current_setting('t.org_a'), 'role', 'learner', 'full_name', 'New Hire'));

DO $$
DECLARE v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM public.training_assignment_rules
   WHERE target_type = 'user' AND target_id = current_setting('t.a_hire') AND is_active;
  IF v_n <> 1 THEN RAISE EXCEPTION 'FAIL: new hire received % individual assignments (expected 1)', v_n; END IF;
  IF EXISTS (SELECT 1 FROM public.training_assignment_rules
              WHERE target_type = 'user' AND target_id = current_setting('t.a_hire')
                AND content_id = current_setting('t.module2')::uuid) THEN
    RAISE EXCEPTION 'FAIL: new hire inherited another learner''s individual assignment';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Learner cannot escalate through process_employee_transfer
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.a_learn'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_ok boolean := false;
BEGIN
  BEGIN
    PERFORM public.process_employee_transfer(auth.uid(), NULL, NULL, 'organization_owner', 'escalate',
                                             current_setting('t.a_admin')::uuid);
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: learner escalated via process_employee_transfer (spoofed actor)'; END IF;

  -- Learners see no analytics and cannot review modules.
  IF (SELECT total_assignees FROM public.get_training_analytics_summary()) <> 0 THEN
    RAISE EXCEPTION 'FAIL: learner can read training analytics';
  END IF;
  v_ok := false;
  BEGIN
    PERFORM public.approve_training_module(current_setting('t.module2')::uuid);
  EXCEPTION WHEN raise_exception THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: learner approved a module'; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Other tenant's admin sees none of org A
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.b_admin'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_ok boolean := false;
BEGIN
  IF (SELECT total_assignees FROM public.get_training_analytics_summary()) <> 0 THEN
    RAISE EXCEPTION 'FAIL: org B admin sees org A assignees';
  END IF;
  IF EXISTS (SELECT 1 FROM public.get_course_analytics() WHERE module_id = current_setting('t.module')::uuid) THEN
    RAISE EXCEPTION 'FAIL: org B admin sees org A course analytics';
  END IF;
  BEGIN
    PERFORM public.approve_training_module(current_setting('t.module2')::uuid);
  EXCEPTION WHEN raise_exception THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: org B admin approved an org A module'; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Org A training manager: tenant analytics and reviews work
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.a_tm'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_total bigint;
BEGIN
  SELECT total_assignees INTO v_total FROM public.get_training_analytics_summary();
  -- 'everyone' rule x 4 org A members (admin, manager, learner, new hire) + the learner's
  -- individual assignment = 5 distinct (learner, module) pairs.
  IF v_total <> 5 THEN RAISE EXCEPTION 'FAIL: training manager sees % assignees in own org (expected 5)', v_total; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.get_course_analytics() WHERE module_id = current_setting('t.module')::uuid) THEN
    RAISE EXCEPTION 'FAIL: training manager cannot see own org course analytics';
  END IF;

  PERFORM public.approve_training_module(current_setting('t.module2')::uuid);
  IF (SELECT status FROM public.training_modules WHERE id = current_setting('t.module2')::uuid) <> 'published' THEN
    RAISE EXCEPTION 'FAIL: training manager approval did not publish';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Org admin: transfers work, but cannot mint an owner
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.a_admin'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_ok boolean := false;
BEGIN
  BEGIN
    PERFORM public.process_employee_transfer(current_setting('t.a_learn')::uuid, NULL, NULL, 'organization_owner', 'promote');
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: org admin minted an organization owner'; END IF;

  PERFORM public.process_employee_transfer(current_setting('t.a_learn')::uuid, NULL, NULL, 'training_manager', 'promotion');
END $$;

RESET ROLE;
DO $$
BEGIN
  IF (SELECT role::text FROM public.organization_memberships
       WHERE user_id = current_setting('t.a_learn')::uuid AND organization_id = current_setting('t.org_a')::uuid) <> 'training_manager' THEN
    RAISE EXCEPTION 'FAIL: transfer did not update the membership role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = current_setting('t.a_learn')::uuid AND role = 'training_manager') THEN
    RAISE EXCEPTION 'FAIL: user_roles view did not follow the membership change';
  END IF;
END $$;

SELECT 'tenant_roles_and_assignments: all checks passed' AS result;

ROLLBACK;
