-- Phase 0: security/performance hygiene (indexes)

-- Missing FK indexes from advisors
CREATE INDEX IF NOT EXISTS idx_admin_delegations_revoked_by ON public.admin_delegations(revoked_by);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_by ON public.profiles(suspended_by);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON public.system_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_training_block_progress_block_id ON public.training_block_progress(block_id);

-- Drop duplicate indexes reported by advisors
DROP INDEX IF EXISTS public.idx_delegations_delegate;
DROP INDEX IF EXISTS public.idx_delegations_delegator;
DROP INDEX IF EXISTS public.idx_delegations_active;
DROP INDEX IF EXISTS public.idx__e5891f81ad43;
DROP INDEX IF EXISTS public.idx__4ef03bfb2411;
