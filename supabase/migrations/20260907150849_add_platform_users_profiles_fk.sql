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
