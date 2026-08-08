-- Fix report_definitions / report_runs SELECT policies to actually respect
-- report scope (scope_type / property_id / department_id) instead of
-- allowing every authenticated user to see every report company-wide.
--
-- Previously:
--   auth_view_report_defs: USING (auth.uid() IS NOT NULL)
--   auth_view_report_runs: USING (auth.uid() IS NOT NULL)
-- Both ignored report_definitions.scope_type/property_id/department_id
-- entirely, so a report scoped to a single property or department was
-- visible to every employee in the Report Builder.
--
-- INSERT/UPDATE/DELETE on both tables already gate on
-- is_hr_or_admin(auth.uid()) and are left unchanged.

-- Reusable visibility check for a report definition, mirroring the
-- can_view_document() pattern already used in this database (creator
-- bypass -> admin-tier bypass -> scope-specific check).
CREATE OR REPLACE FUNCTION public.can_view_report_definition(_report_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rpt record;
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  SELECT rd.id, rd.scope_type, rd.property_id, rd.department_id, rd.created_by
  INTO rpt
  FROM public.report_definitions rd
  WHERE rd.id = _report_id
  LIMIT 1;

  IF rpt IS NULL THEN
    RETURN false;
  END IF;

  -- Creators can always view their own report definitions.
  IF rpt.created_by IS NOT NULL AND rpt.created_by = (select auth.uid()) THEN
    RETURN true;
  END IF;

  -- HR/Admin-tier roles (mirrors the role list already used by
  -- hr_admin_manage_report_defs_* / hr_admin_manage_report_runs_* to
  -- manage this table).
  IF public.is_hr_or_admin((select auth.uid())) THEN
    RETURN true;
  END IF;

  IF rpt.scope_type = 'global' THEN
    RETURN true;
  ELSIF rpt.scope_type = 'property' THEN
    RETURN rpt.property_id IS NOT NULL
      AND public.has_property_access((select auth.uid()), rpt.property_id);
  ELSIF rpt.scope_type = 'department' THEN
    RETURN rpt.department_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.user_departments ud
        WHERE ud.user_id = (select auth.uid())
          AND ud.department_id = rpt.department_id
      );
  END IF;

  RETURN false;
END;
$function$;

-- report_definitions: replace blanket "any authenticated user" SELECT
-- policy with the scope-aware check above.
DROP POLICY IF EXISTS auth_view_report_defs ON public.report_definitions;
CREATE POLICY auth_view_report_defs ON public.report_definitions
FOR SELECT
USING (public.can_view_report_definition(id));

-- report_runs: a run has no scope columns of its own, so visibility
-- follows the parent report_definitions row via report_id. The user who
-- triggered a run can always see it (mirrors the created_by bypass).
DROP POLICY IF EXISTS auth_view_report_runs ON public.report_runs;
CREATE POLICY auth_view_report_runs ON public.report_runs
FOR SELECT
USING (
  (triggered_by IS NOT NULL AND triggered_by = (select auth.uid()))
  OR public.can_view_report_definition(report_id)
);
