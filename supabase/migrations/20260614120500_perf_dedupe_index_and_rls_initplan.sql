-- =============================================================================
-- MIGRATION: perf_dedupe_index_and_rls_initplan
-- Applied: 2026-06-14
-- Purpose: Two performance advisor fixes.
--   1. duplicate_index: training_progress had two identical UNIQUE constraints
--      on (user_id, training_id). Drop the redundant one.
--   2. auth_rls_initplan: system_events RLS policies called auth.uid() directly,
--      forcing re-evaluation per row. Wrap in (SELECT auth.uid()) so it is
--      evaluated once per query. (system_events is the only data-bearing table,
--      hence the only one the advisor flagged.)
-- Rollback:
--   1. Re-add: ALTER TABLE training_progress ADD CONSTRAINT
--        training_progress_user_training_unique UNIQUE (user_id, training_id);
--   2. Re-apply the policies with bare auth.uid() (see git history).
-- =============================================================================

BEGIN;

-- 1. Drop duplicate unique constraint (keep training_progress_user_id_training_id_key)
ALTER TABLE public.training_progress
  DROP CONSTRAINT IF EXISTS training_progress_user_training_unique;

-- 2. Wrap auth.uid() in scalar subselect (eval once per query, not per row)
ALTER POLICY "system_events_admin_read" ON public.system_events
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role])
  ));

ALTER POLICY "system_events_own_read" ON public.system_events
  USING (actor_id = (SELECT auth.uid()));

ALTER POLICY "system_events_insert_own" ON public.system_events
  WITH CHECK ((actor_id = (SELECT auth.uid())) OR (actor_id IS NULL));

COMMIT;
