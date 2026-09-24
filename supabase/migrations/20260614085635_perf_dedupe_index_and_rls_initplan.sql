BEGIN;
-- 1. Drop duplicate unique constraint on training_progress (two identical uniques on (user_id, training_id)).
--    Keep training_progress_user_id_training_id_key; drop the redundant one.
ALTER TABLE public.training_progress DROP CONSTRAINT IF EXISTS training_progress_user_training_unique;

-- 2. Fix auth_rls_initplan on system_events: wrap auth.uid() in scalar subselect (eval once per query).
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
