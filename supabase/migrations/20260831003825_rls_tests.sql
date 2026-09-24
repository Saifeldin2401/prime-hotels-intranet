DO $gate$
DECLARE
  v_tables text[] := ARRAY[
    'training_modules','training_progress','learning_quizzes','learning_quiz_questions',
    'unified_questions','unified_question_options','documents','certificates','skills',
    'training_paths','training_path_modules','training_assignment_rules',
    'training_assignment_submissions','media_assets','course_visual_assets','departments'
  ];
  t   text;
  r   record;
  n   int;
BEGIN
  -- 1. No FOR ALL policies remain on the learning tables
  FOREACH t IN ARRAY v_tables LOOP
    SELECT count(*) INTO n
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = t AND cmd = 'ALL';
    ASSERT n = 0, format('table %s still has a FOR ALL policy', t);
  END LOOP;

  -- 2. Every INSERT/UPDATE policy on the learning tables has WITH CHECK
  FOR r IN
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (v_tables)
      AND cmd IN ('INSERT','UPDATE')
      AND with_check IS NULL
  LOOP
    RAISE EXCEPTION 'policy %.% (%s) is missing WITH CHECK', r.tablename, r.policyname, r.cmd;
  END LOOP;

  -- 3. Every learning table exposes all four operations via a p5_ policy
  FOREACH t IN ARRAY v_tables LOOP
    SELECT c.relkind INTO r FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public' AND c.relname = t;
    IF r.relkind = 'r' THEN
      FOR r IN SELECT unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS c LOOP
        SELECT count(*) INTO n
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t
          AND cmd = r.c AND policyname LIKE 'p5\_%';
        ASSERT n >= 1, format('table %s has no p5_ policy for %s', t, r.c);
      END LOOP;
    END IF;
  END LOOP;

  -- 4. RLS is enabled on every learning table
  FOREACH t IN ARRAY v_tables LOOP
    SELECT c.relrowsecurity, c.relkind INTO r
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public' AND c.relname = t;
    IF r.relkind = 'r' THEN
      ASSERT r.relrowsecurity, format('RLS not enabled on %s', t);
    END IF;
  END LOOP;

  -- 5. Role-resolution invariants
  ASSERT 'administrator'    = ANY (public.roles_satisfying('learner')),           'administrator must satisfy learner';
  ASSERT 'administrator'    = ANY (public.roles_satisfying('training_manager')),  'administrator must satisfy training_manager';
  ASSERT 'training_manager' = ANY (public.roles_satisfying('author')),            'training_manager must satisfy author';
  ASSERT 'training_manager' = ANY (public.roles_satisfying('knowledge_manager')), 'training_manager must satisfy knowledge_manager';
  ASSERT NOT ('learner' = ANY (public.roles_satisfying('administrator'))),        'learner must NOT satisfy administrator';
  ASSERT NOT ('author'  = ANY (public.roles_satisfying('training_manager'))),     'author must NOT satisfy training_manager';
  ASSERT NOT ('training_manager' = ANY (public.roles_satisfying('administrator'))), 'training_manager must NOT satisfy administrator';

  ASSERT 'department_head'  = ANY (public.roles_satisfying('author')),            'legacy department_head must satisfy author';
  ASSERT 'staff'            = ANY (public.roles_satisfying('learner')),           'legacy staff must satisfy learner';
  ASSERT 'regional_hr'      = ANY (public.roles_satisfying('training_manager')),  'legacy regional_hr must satisfy training_manager';
  ASSERT 'property_manager' = ANY (public.roles_satisfying('training_manager')),  'legacy property_manager must satisfy training_manager';
  ASSERT NOT ('regional_admin' = ANY (public.roles_satisfying('administrator'))), 'regional_admin must NOT satisfy administrator (business call: training_manager)';

  RAISE NOTICE 'five-role RLS regression gate: all assertions passed';
END
$gate$;

DO $grants$
BEGIN
  ASSERT has_table_privilege('authenticated','public.training_modules','SELECT'), 'authenticated lost SELECT on training_modules';
  ASSERT has_table_privilege('authenticated','public.training_modules','INSERT'), 'authenticated lost INSERT on training_modules';
  ASSERT has_table_privilege('authenticated','public.training_progress','UPDATE'), 'authenticated lost UPDATE on training_progress';
END
$grants$;
