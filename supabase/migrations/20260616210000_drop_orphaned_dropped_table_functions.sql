-- These 4 functions reference tables dropped during consolidation
-- (learning_assignments / learning_progress / training_content_blocks) and are
-- fully orphaned: not attached to any trigger, not called by any other function,
-- and not invoked from the frontend. They would error if ever called. Remove them.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'finalize_module_learning_progress_from_metadata',
        'handle_new_learning_assignment_notification',
        'normalize_learning_progress_last_block_id',
        'training_content_blocks_resolve_duplicate_order'
      )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig;
  END LOOP;
END $$;
