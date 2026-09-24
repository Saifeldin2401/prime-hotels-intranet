-- P7a: Lock down EXECUTE on internal SECURITY DEFINER functions.
--
-- Goal: revoke EXECUTE from anon / authenticated / PUBLIC on every SECURITY DEFINER
-- function in schema public that is either
--   (i) a trigger function (returns trigger), or
--  (ii) an internal-only helper never meant to be a PostgREST RPC.
-- service_role keeps EXECUTE everywhere (edge functions rely on it).
-- Functions invoked directly inside RLS policy expressions are deliberately
-- LEFT ALONE - RLS evaluates them as the invoking (authenticated) role, so
-- removing their grant would break row security. Verified against pg_policy
-- bodies before writing this migration:
--   can_manage_employee_document, can_view_document, can_view_employee_document,
--   can_view_report_definition, current_user_organization_ids, get_user_departments,
--   get_user_properties, has_active_platform_session, has_any_role, has_profile_access,
--   has_property_access, has_role, has_role_optimized, has_tenant_access,
--   is_content_author, is_content_manager, is_hr_or_admin, is_learning_editor,
--   is_platform_admin, is_platform_operator, is_platform_super_admin, is_tenant_admin,
--   is_tenant_content_editor, is_tenant_people_admin, is_training_manager,
--   org_is_operational, org_visible, platform_operator_can, platform_operator_has_role,
--   users_share_active_org
-- -> all retained.
--
-- This migration is idempotent (re-running REVOKE is a no-op) and transactional.

BEGIN;

-- ---------------------------------------------------------------------------
-- (i) Every SECURITY DEFINER trigger function in schema public.
--     Trigger functions cannot be called as RPCs meaningfully; triggers fire
--     regardless of EXECUTE grants, so this is zero-risk.
--     Includes the P5/P6 org-stamping trigger helpers explicitly:
--       set_announcement_child_org, set_documents_child_org, set_training_child_org,
--       p6_set_org_from_sop_comment and every other p6_set_org_* /
--       p6_set_org_learning_events, set_p5_org_from_parent, set_p5_child_org_from_parent,
--       set_messaging_*, set_organization_id_*, set_org_from_*, tg_audit_set_organization_id.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- (ii) Internal-only helpers that are never meant to be PostgREST RPCs and are
--      not referenced by any RLS policy body. Conservatively limited to the
--      clearly-internal, underscore-prefixed helpers.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r      record;
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

-- ---------------------------------------------------------------------------
-- Tighten two write policies that currently gate on editor/enrollment status
-- rather than tenant membership.
-- ---------------------------------------------------------------------------

-- objective_links: writes require tenant content-editor rights within a visible
-- org (platform super admin bypass retained).
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

-- lesson_progress: writes require that the row's enrollment belongs to the
-- caller AND the row's org is visible to the caller (platform super admin
-- bypass retained for operator support).
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
