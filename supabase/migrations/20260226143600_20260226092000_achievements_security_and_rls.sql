-- Resolve outstanding security advisor findings for achievements + mutable search_path.

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS achievement_definitions_select ON public.achievement_definitions;
CREATE POLICY achievement_definitions_select
  ON public.achievement_definitions FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role::text IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_hr')
    )
  );

DROP POLICY IF EXISTS achievement_definitions_manage_admin ON public.achievement_definitions;
CREATE POLICY achievement_definitions_manage_admin
  ON public.achievement_definitions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role::text IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_hr')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role::text IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_hr')
    )
  );

-- Ensure view executes with caller privileges (security-invoker).
ALTER VIEW public.achievement_leaderboard SET (security_invoker = true);
REVOKE ALL ON public.achievement_leaderboard FROM PUBLIC;
GRANT SELECT ON public.achievement_leaderboard TO authenticated;

-- Harden mutable search_path functions reported by advisors.
DO $$
DECLARE
  fn_identity text;
BEGIN
  FOR fn_identity IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = ANY (ARRAY[
        'get_task_completion_metrics',
        'check_and_award_achievement',
        'search_job_titles_by_similarity',
        'search_departments_by_similarity',
        'search_properties_by_similarity',
        'trigger_check_achievements_on_training'
      ])
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = public, auth, extensions',
      fn_identity
    );
  END LOOP;
END $$;;
