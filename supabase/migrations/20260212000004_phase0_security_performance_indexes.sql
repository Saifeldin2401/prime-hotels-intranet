-- Phase 0: security/performance hygiene (indexes)

-- Missing FK indexes from advisors.
-- Guard each index creation so migration remains idempotent across schema variants.
DO $$
BEGIN
  IF to_regclass('public.admin_delegations') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'admin_delegations'
         AND column_name = 'revoked_by'
     ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_admin_delegations_revoked_by ON public.admin_delegations(revoked_by)';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'profiles'
         AND column_name = 'suspended_by'
     ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_suspended_by ON public.profiles(suspended_by)';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.system_settings') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'system_settings'
         AND column_name = 'updated_by'
     ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON public.system_settings(updated_by)';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.training_block_progress') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'training_block_progress'
         AND column_name = 'block_id'
     ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_training_block_progress_block_id ON public.training_block_progress(block_id)';
  END IF;
END $$;

-- Drop duplicate indexes reported by advisors
DROP INDEX IF EXISTS public.idx_delegations_delegate;
DROP INDEX IF EXISTS public.idx_delegations_delegator;
DROP INDEX IF EXISTS public.idx_delegations_active;
DROP INDEX IF EXISTS public.idx__e5891f81ad43;
DROP INDEX IF EXISTS public.idx__4ef03bfb2411;
