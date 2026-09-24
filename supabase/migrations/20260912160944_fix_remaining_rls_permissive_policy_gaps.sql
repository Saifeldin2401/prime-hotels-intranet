
-- Resolves the 7 multiple_permissive_policies pairs left unfixed earlier
-- because they had real, confirmed gaps between the write (FOR ALL) and read
-- (SELECT) policies rather than a pure duplication. Each is fixed in the
-- direction that doesn't remove any access anyone currently relies on:
--
--   TIGHTEN WRITE (closes an over-permission that read never granted):
--     - learning_assignments: write had no hotel_id scoping; read did.
--     - user_sessions: write's admin check allowed brand_admin; read's didn't
--       (session management is sensitive enough to warrant the narrower set).
--
--   WIDEN READ (adds visibility that write already implied, closing an
--   inconsistency without removing anything that works today):
--     - learning_quizzes, training_modules: read didn't recognize all the
--       roles/authorship write did, and excluded soft-deleted rows even for
--       their own editors.
--     - lesson_progress: read checked the legacy user_roles table only;
--       write checks the current platform_users-based super-admin check.
--     - training_session_attendees, user_competencies: a generic platform
--       operator satisfied write's "people_admin" check but not read's
--       "content_editor" check.
--
-- After each fix, the write policy is split into INSERT/UPDATE/DELETE-only
-- (matching the pattern already applied to the other 36 tables), since read
-- now covers everything write grants.

DO $$
DECLARE
  roles_sql text;
  cmd_name text;
  v_qual text;
  v_with_check text;
BEGIN
  -- ===================================================================
  -- 1. learning_assignments: tighten write to match read's hotel scoping.
  -- ===================================================================
  SELECT qual INTO v_qual FROM pg_policies
    WHERE schemaname='public' AND tablename='learning_assignments' AND policyname='learning_assignments_select';
  SELECT array_to_string(roles, ', ') INTO roles_sql FROM pg_policies
    WHERE schemaname='public' AND tablename='learning_assignments' AND policyname='learning_assignments_manage';

  EXECUTE 'DROP POLICY learning_assignments_manage ON public.learning_assignments';
  FOREACH cmd_name IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.learning_assignments FOR %s TO %s%s%s',
      'learning_assignments_manage_' || lower(cmd_name), cmd_name, roles_sql,
      CASE WHEN cmd_name IN ('UPDATE','DELETE') THEN format(' USING (%s)', v_qual) ELSE '' END,
      CASE WHEN cmd_name IN ('INSERT','UPDATE') THEN format(' WITH CHECK (%s)', v_qual) ELSE '' END
    );
  END LOOP;

  -- ===================================================================
  -- 2. user_sessions: tighten write's admin check (is_tenant_admin, which
  --    includes brand_admin) to is_tenant_people_admin, matching read.
  -- ===================================================================
  SELECT qual, array_to_string(roles, ', ') INTO v_qual, roles_sql FROM pg_policies
    WHERE schemaname='public' AND tablename='user_sessions' AND policyname='user_sessions_manage_tenant';
  v_qual := replace(v_qual, 'is_tenant_admin(organization_id)', 'is_tenant_people_admin(organization_id)');

  EXECUTE 'DROP POLICY user_sessions_manage_tenant ON public.user_sessions';
  FOREACH cmd_name IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.user_sessions FOR %s TO %s%s%s',
      'user_sessions_manage_tenant_' || lower(cmd_name), cmd_name, roles_sql,
      CASE WHEN cmd_name IN ('UPDATE','DELETE') THEN format(' USING (%s)', v_qual) ELSE '' END,
      CASE WHEN cmd_name IN ('INSERT','UPDATE') THEN format(' WITH CHECK (%s)', v_qual) ELSE '' END
    );
  END LOOP;

  -- ===================================================================
  -- 3. learning_quizzes: widen read to also cover everything write grants.
  -- ===================================================================
  SELECT qual INTO v_qual FROM pg_policies
    WHERE schemaname='public' AND tablename='learning_quizzes' AND policyname='learning_quizzes_write';
  EXECUTE format(
    'ALTER POLICY learning_quizzes_sel ON public.learning_quizzes USING ((%s) OR (%s))',
    (SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename='learning_quizzes' AND policyname='learning_quizzes_sel'),
    v_qual
  );
  SELECT qual, with_check, array_to_string(roles, ', ') INTO v_qual, v_with_check, roles_sql FROM pg_policies
    WHERE schemaname='public' AND tablename='learning_quizzes' AND policyname='learning_quizzes_write';
  EXECUTE 'DROP POLICY learning_quizzes_write ON public.learning_quizzes';
  FOREACH cmd_name IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.learning_quizzes FOR %s TO %s%s%s',
      'learning_quizzes_write_' || lower(cmd_name), cmd_name, roles_sql,
      CASE WHEN cmd_name IN ('UPDATE','DELETE') THEN format(' USING (%s)', v_qual) ELSE '' END,
      CASE WHEN cmd_name IN ('INSERT','UPDATE') THEN format(' WITH CHECK (%s)', v_with_check) ELSE '' END
    );
  END LOOP;

  -- ===================================================================
  -- 4. training_modules: widen read to also cover everything write grants.
  -- ===================================================================
  SELECT qual INTO v_qual FROM pg_policies
    WHERE schemaname='public' AND tablename='training_modules' AND policyname='multitenant_training_modules_write';
  EXECUTE format(
    'ALTER POLICY multitenant_training_modules_select ON public.training_modules USING ((%s) OR (%s))',
    (SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename='training_modules' AND policyname='multitenant_training_modules_select'),
    v_qual
  );
  SELECT qual, array_to_string(roles, ', ') INTO v_qual, roles_sql FROM pg_policies
    WHERE schemaname='public' AND tablename='training_modules' AND policyname='multitenant_training_modules_write';
  EXECUTE 'DROP POLICY multitenant_training_modules_write ON public.training_modules';
  FOREACH cmd_name IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.training_modules FOR %s TO %s%s%s',
      'multitenant_training_modules_write_' || lower(cmd_name), cmd_name, roles_sql,
      CASE WHEN cmd_name IN ('UPDATE','DELETE') THEN format(' USING (%s)', v_qual) ELSE '' END,
      -- original with_check was NULL (defaults to USING clause for FOR ALL policies)
      CASE WHEN cmd_name IN ('INSERT','UPDATE') THEN format(' WITH CHECK (%s)', v_qual) ELSE '' END
    );
  END LOOP;

  -- ===================================================================
  -- 5. lesson_progress: widen read to also cover write's new-system check.
  -- ===================================================================
  SELECT qual INTO v_qual FROM pg_policies
    WHERE schemaname='public' AND tablename='lesson_progress' AND policyname='lesson_progress_write';
  EXECUTE format(
    'ALTER POLICY lesson_progress_select ON public.lesson_progress USING ((%s) OR (%s))',
    (SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename='lesson_progress' AND policyname='lesson_progress_select'),
    v_qual
  );
  SELECT qual, with_check, array_to_string(roles, ', ') INTO v_qual, v_with_check, roles_sql FROM pg_policies
    WHERE schemaname='public' AND tablename='lesson_progress' AND policyname='lesson_progress_write';
  EXECUTE 'DROP POLICY lesson_progress_write ON public.lesson_progress';
  FOREACH cmd_name IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.lesson_progress FOR %s TO %s%s%s',
      'lesson_progress_write_' || lower(cmd_name), cmd_name, roles_sql,
      CASE WHEN cmd_name IN ('UPDATE','DELETE') THEN format(' USING (%s)', v_qual) ELSE '' END,
      CASE WHEN cmd_name IN ('INSERT','UPDATE') THEN format(' WITH CHECK (%s)', v_with_check) ELSE '' END
    );
  END LOOP;

  -- ===================================================================
  -- 6. training_session_attendees: widen read to cover write's grant.
  -- ===================================================================
  SELECT qual INTO v_qual FROM pg_policies
    WHERE schemaname='public' AND tablename='training_session_attendees' AND policyname='training_session_attendees_write';
  EXECUTE format(
    'ALTER POLICY training_session_attendees_sel ON public.training_session_attendees USING ((%s) OR (%s))',
    (SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename='training_session_attendees' AND policyname='training_session_attendees_sel'),
    v_qual
  );
  SELECT qual, with_check, array_to_string(roles, ', ') INTO v_qual, v_with_check, roles_sql FROM pg_policies
    WHERE schemaname='public' AND tablename='training_session_attendees' AND policyname='training_session_attendees_write';
  EXECUTE 'DROP POLICY training_session_attendees_write ON public.training_session_attendees';
  FOREACH cmd_name IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.training_session_attendees FOR %s TO %s%s%s',
      'training_session_attendees_write_' || lower(cmd_name), cmd_name, roles_sql,
      CASE WHEN cmd_name IN ('UPDATE','DELETE') THEN format(' USING (%s)', v_qual) ELSE '' END,
      CASE WHEN cmd_name IN ('INSERT','UPDATE') THEN format(' WITH CHECK (%s)', v_with_check) ELSE '' END
    );
  END LOOP;

  -- ===================================================================
  -- 7. user_competencies: widen read to cover write's grant.
  -- ===================================================================
  SELECT qual INTO v_qual FROM pg_policies
    WHERE schemaname='public' AND tablename='user_competencies' AND policyname='user_competencies_write';
  EXECUTE format(
    'ALTER POLICY user_competencies_sel ON public.user_competencies USING ((%s) OR (%s))',
    (SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename='user_competencies' AND policyname='user_competencies_sel'),
    v_qual
  );
  SELECT qual, with_check, array_to_string(roles, ', ') INTO v_qual, v_with_check, roles_sql FROM pg_policies
    WHERE schemaname='public' AND tablename='user_competencies' AND policyname='user_competencies_write';
  EXECUTE 'DROP POLICY user_competencies_write ON public.user_competencies';
  FOREACH cmd_name IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.user_competencies FOR %s TO %s%s%s',
      'user_competencies_write_' || lower(cmd_name), cmd_name, roles_sql,
      CASE WHEN cmd_name IN ('UPDATE','DELETE') THEN format(' USING (%s)', v_qual) ELSE '' END,
      CASE WHEN cmd_name IN ('INSERT','UPDATE') THEN format(' WITH CHECK (%s)', v_with_check) ELSE '' END
    );
  END LOOP;
END $$;
