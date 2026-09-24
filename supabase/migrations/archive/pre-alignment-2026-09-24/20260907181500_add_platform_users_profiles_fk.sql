-- ============================================================================
-- Migration: 20260907181500_add_platform_users_profiles_fk.sql
-- Description: Add foreign key relationship between platform_users(user_id) and profiles(id)
--              to allow PostgREST to resolve joins and maintain referential integrity.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'platform_users_profiles_fkey'
  ) THEN
    ALTER TABLE public.platform_users
      ADD CONSTRAINT platform_users_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;
