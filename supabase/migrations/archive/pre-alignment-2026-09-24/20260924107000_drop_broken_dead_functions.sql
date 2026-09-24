-- Functions that reference tables dropped in earlier cleanups (delegations,
-- escalation_rules, onboarding_process, onboarding_tasks) and have no caller in
-- the app, edge functions, cron, triggers or policies - they could only fail.
DO $$
DECLARE
  v_fn regprocedure;
BEGIN
  FOR v_fn IN
    SELECT p.oid::regprocedure
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname IN (
         'approve_document_atomic', 'reject_document_atomic', 'can_user_act_on_document_approval',
         'expire_delegations', 'check_and_escalate_pending_actions', 'calculate_onboarding_progress')
  LOOP
    EXECUTE format('DROP FUNCTION %s', v_fn);
  END LOOP;
END $$;
