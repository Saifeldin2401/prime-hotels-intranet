-- Migration: RLS regression gate for the 5-role model
-- File: 20260901110200_rls_tests.sql
--
-- ============================================================================
-- APPLY ON STAGING FIRST. Requires 20260901110000 + 20260901110100.
-- This migration performs NO schema changes. Every check is an ASSERT; the
-- migration fails (and the deploy aborts) if any invariant is violated.
-- Run it in CI against a staging branch as the regression gate for role/RLS
-- changes. Plain SQL - no pgTAP extension required.
-- ============================================================================

DO $gate$
DECLARE
  v_tables text[] := ARRAY[
    'training_modules','training_progress','learning_quizzes','learning_quiz_questions',
    'unified_questions','unified_question_options','documents','certificates','skills',
    'training_paths','training_path_modules','training_assignment_rules',
    'training_assignment_submissions','media_assets','course_visual_assets','departments'
  ];
  v_write_tables text[] := ARRAY[
    'training_modules','learning_quizzes','unified_questions','training_paths',
    'training_assignment_rules','skills','media_assets','departments','documents',
    'course_visual_assets'
  ];
  t   text;
  r   record;
  n   int;
BEGIN
  -- ------------------------------------------------------------------
  -- 1. No FOR ALL policies remain on the learning tables
  -- ------------------------------------------------------------------
  FOREACH t IN ARRAY v_tables LOOP
    SELECT count(*) INTO n
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = t AND cmd = 'ALL';
    ASSERT n = 0, format('table %s still has a FOR ALL policy', t);
  END LOOP;

  -- ------------------------------------------------------------------
  -- 2. Every INSERT/UPDATE policy on the learning tables has WITH CHECK
  -- ------------------------------------------------------------------
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

  -- ------------------------------------------------------------------
  -- 3. Every learning table exposes all four operations via a p5_ policy
  -- ------------------------------------------------------------------
  FOREACH t IN ARRAY v_tables LOOP
    FOR r IN SELECT unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS c LOOP
      SELECT count(*) INTO n
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
        AND cmd = r.c AND policyname LIKE 'p5\_%';
      ASSERT n >= 1, format('table %s has no p5_ policy for %s', t, r.c);
    END LOOP;
  END LOOP;

  -- ------------------------------------------------------------------
  -- 4. RLS is enabled on every learning table
  -- ------------------------------------------------------------------
  FOREACH t IN ARRAY v_tables LOOP
    SELECT c.relrowsecurity INTO r
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public' AND c.relname = t;
    ASSERT r.relrowsecurity, format('RLS not enabled on %s', t);
  END LOOP;

  -- ------------------------------------------------------------------
  -- 5. Role-resolution invariants (roles_satisfying / has_role logic)
  -- ------------------------------------------------------------------
  ASSERT 'administrator'    = ANY (public.roles_satisfying('learner')),           'administrator must satisfy learner';
  ASSERT 'administrator'    = ANY (public.roles_satisfying('training_manager')),  'administrator must satisfy training_manager';
  ASSERT 'training_manager' = ANY (public.roles_satisfying('author')),            'training_manager must satisfy author';
  ASSERT 'training_manager' = ANY (public.roles_satisfying('knowledge_manager')), 'training_manager must satisfy knowledge_manager';
  ASSERT NOT ('learner' = ANY (public.roles_satisfying('administrator'))),        'learner must NOT satisfy administrator';
  ASSERT NOT ('author'  = ANY (public.roles_satisfying('training_manager'))),     'author must NOT satisfy training_manager';
  ASSERT NOT ('training_manager' = ANY (public.roles_satisfying('administrator'))), 'training_manager must NOT satisfy administrator';

  -- Legacy <-> platform bridging
  ASSERT 'department_head'  = ANY (public.roles_satisfying('author')),            'legacy department_head must satisfy author';
  ASSERT 'staff'            = ANY (public.roles_satisfying('learner')),           'legacy staff must satisfy learner';
  ASSERT 'regional_hr'      = ANY (public.roles_satisfying('training_manager')),  'legacy regional_hr must satisfy training_manager';
  ASSERT 'property_manager' = ANY (public.roles_satisfying('training_manager')),  'legacy property_manager must satisfy training_manager';
  ASSERT NOT ('regional_admin' = ANY (public.roles_satisfying('administrator'))), 'regional_admin must NOT satisfy administrator (business call: training_manager)';

  -- ------------------------------------------------------------------
  -- 6. Live-user backfill: the 7 current users resolved to the right tier
  --    (user ids are stable; skipped automatically if a row is absent)
  -- ------------------------------------------------------------------
  PERFORM 1;
  -- corporate_admin -> administrator
  ASSERT (SELECT public.has_role('641ac54a-7a0d-4bf8-a2d5-46845e0cabdf','administrator')
          OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id='641ac54a-7a0d-4bf8-a2d5-46845e0cabdf')),
         'admin@prime.com should resolve to administrator';
  -- department_head -> author, NOT training_manager
  ASSERT (SELECT public.has_role('2dc33cc2-4a67-4afe-a02a-de1a282236cc','author')
          OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id='2dc33cc2-4a67-4afe-a02a-de1a282236cc')),
         'department_head user should resolve to author';
  ASSERT (SELECT NOT public.has_role('2dc33cc2-4a67-4afe-a02a-de1a282236cc','administrator')
          OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id='2dc33cc2-4a67-4afe-a02a-de1a282236cc')),
         'department_head user must NOT be administrator';
  -- regional_hr -> training_manager
  ASSERT (SELECT public.has_role('5aa53b85-30df-4acb-a638-2c7adafa07e5','training_manager')
          OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id='5aa53b85-30df-4acb-a638-2c7adafa07e5')),
         'regional_hr user should resolve to training_manager';
  -- staff -> learner, nothing more
  ASSERT (SELECT public.has_role('ffd0d9ae-e982-4320-be79-539527110ee0','learner')
          OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id='ffd0d9ae-e982-4320-be79-539527110ee0')),
         'staff user should resolve to learner';
  ASSERT (SELECT NOT public.has_role('ffd0d9ae-e982-4320-be79-539527110ee0','author')
          OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id='ffd0d9ae-e982-4320-be79-539527110ee0')),
         'staff user must NOT be author';
  ASSERT (SELECT NOT public.has_role('ffd0d9ae-e982-4320-be79-539527110ee0','training_manager')
          OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id='ffd0d9ae-e982-4320-be79-539527110ee0')),
         'staff user must NOT be training_manager';
  -- regional_admin -> training_manager, NOT administrator
  ASSERT (SELECT NOT public.has_role('48ca233f-4667-4820-bf01-b958764300f7','administrator')
          OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id='48ca233f-4667-4820-bf01-b958764300f7')),
         'regional_admin user must NOT be administrator';

  RAISE NOTICE 'five-role RLS regression gate: all assertions passed';
END
$gate$;

-- ---------------------------------------------------------------------------
-- 7. has_table_privilege sanity: authenticated keeps table-level DML grants
--    (RLS - not GRANT - is what constrains rows; a missing GRANT would make
--    every policy above dead). One representative table.
-- ---------------------------------------------------------------------------
DO $grants$
BEGIN
  ASSERT has_table_privilege('authenticated','public.training_modules','SELECT'), 'authenticated lost SELECT on training_modules';
  ASSERT has_table_privilege('authenticated','public.training_modules','INSERT'), 'authenticated lost INSERT on training_modules';
  ASSERT has_table_privilege('authenticated','public.training_progress','UPDATE'), 'authenticated lost UPDATE on training_progress';
END
$grants$;
