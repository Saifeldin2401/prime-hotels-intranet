-- P7a: Lock down EXECUTE on internal SECURITY DEFINER functions.
BEGIN;

DO $$
DECLARE
  r        record;
  n_trig   int := 0;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    JOIN pg_type t       ON t.oid  = p.prorettype
    WHERE ns.nspname = 'public'
      AND p.prosecdef
      AND t.typname = 'trigger'
  LOOP
    BEGIN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated, PUBLIC', r.sig);
      n_trig := n_trig + 1;
    EXCEPTION
      WHEN undefined_function THEN NULL;
    END;
  END LOOP;
  RAISE NOTICE 'P7a: revoked EXECUTE on % SECURITY DEFINER trigger functions', n_trig;
END $$;

DO $$
DECLARE
  n_int  int := 0;
  sigs   text[] := ARRAY[
    'public._job_org(uuid, uuid)',
    'public._legacy_platform_fallback(uuid)'
  ];
  s text;
BEGIN
  FOREACH s IN ARRAY sigs LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated, PUBLIC', s);
      n_int := n_int + 1;
    EXCEPTION
      WHEN undefined_function THEN NULL;
    END;
  END LOOP;
  RAISE NOTICE 'P7a: revoked EXECUTE on % internal helper functions', n_int;
END $$;

DROP POLICY IF EXISTS objective_links_write ON public.objective_links;
CREATE POLICY objective_links_write ON public.objective_links
  FOR ALL
  TO authenticated
  USING (
    is_platform_super_admin()
    OR (
      organization_id IS NOT NULL
      AND org_visible(organization_id)
      AND is_tenant_content_editor(organization_id)
    )
  )
  WITH CHECK (
    is_platform_super_admin()
    OR (
      organization_id IS NOT NULL
      AND org_visible(organization_id)
      AND is_tenant_content_editor(organization_id)
    )
  );

DROP POLICY IF EXISTS lesson_progress_write ON public.lesson_progress;
CREATE POLICY lesson_progress_write ON public.lesson_progress
  FOR ALL
  TO authenticated
  USING (
    is_platform_super_admin()
    OR (
      organization_id IS NOT NULL
      AND org_visible(organization_id)
      AND EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = lesson_progress.enrollment_id
          AND e.user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    is_platform_super_admin()
    OR (
      organization_id IS NOT NULL
      AND org_visible(organization_id)
      AND EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = lesson_progress.enrollment_id
          AND e.user_id = (SELECT auth.uid())
      )
    )
  );

COMMIT;
