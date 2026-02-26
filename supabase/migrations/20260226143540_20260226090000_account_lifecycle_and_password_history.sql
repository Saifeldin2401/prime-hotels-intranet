-- Align account lifecycle + password hardening schema with production usage.
-- This migration is fully idempotent and safe to run on existing environments.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles: lifecycle + password state columns required by auth/account flows
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS account_status text,
  ADD COLUMN IF NOT EXISTS is_temp_password boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS force_password_reset boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_initialized boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_last_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid,
  ADD COLUMN IF NOT EXISTS suspend_reason text;

UPDATE public.profiles
SET
  date_of_birth = COALESCE(date_of_birth, CURRENT_DATE),
  account_status = COALESCE(account_status, 'active'),
  is_temp_password = COALESCE(is_temp_password, false),
  force_password_reset = COALESCE(force_password_reset, false),
  password_initialized = COALESCE(password_initialized, false),
  failed_login_attempts = COALESCE(failed_login_attempts, 0)
WHERE
  date_of_birth IS NULL
  OR account_status IS NULL
  OR is_temp_password IS NULL
  OR force_password_reset IS NULL
  OR password_initialized IS NULL
  OR failed_login_attempts IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN date_of_birth SET NOT NULL,
  ALTER COLUMN account_status SET DEFAULT 'active',
  ALTER COLUMN account_status SET NOT NULL,
  ALTER COLUMN force_password_reset SET DEFAULT false,
  ALTER COLUMN force_password_reset SET NOT NULL,
  ALTER COLUMN is_temp_password SET DEFAULT false,
  ALTER COLUMN password_initialized SET DEFAULT false,
  ALTER COLUMN failed_login_attempts SET DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_account_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('active', 'suspended', 'locked', 'inactive'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'suspended_by'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_suspended_by_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_suspended_by_fkey
      FOREIGN KEY (suspended_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_force_password_reset ON public.profiles(force_password_reset);
CREATE INDEX IF NOT EXISTS idx_profiles_password_last_changed_at ON public.profiles(password_last_changed_at DESC);

-- ---------------------------------------------------------------------------
-- Password history table for reuse checks and secure password rotations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.password_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user_created_at
  ON public.password_history(user_id, created_at DESC);

ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS password_history_select_own ON public.password_history;
CREATE POLICY password_history_select_own
  ON public.password_history FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS password_history_insert_own ON public.password_history;
CREATE POLICY password_history_insert_own
  ON public.password_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Keep password_history in sync when auth.users password changes.
CREATE OR REPLACE FUNCTION public.save_password_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.encrypted_password <> OLD.encrypted_password THEN
    INSERT INTO public.password_history (user_id, password_hash)
    VALUES (NEW.id, NEW.encrypted_password);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_password_change ON auth.users;
CREATE TRIGGER on_password_change
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.save_password_history();

DO $$
BEGIN
  IF to_regprocedure('public.check_password_reuse(text)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.check_password_reuse(text) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.check_password_reuse(text) TO service_role';
  END IF;

  IF to_regprocedure('public.complete_password_reset()') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.complete_password_reset() TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.complete_password_reset() TO service_role';
  END IF;
END $$;;
