-- Remove permissive/duplicate notification RLS policies and keep secure defaults.

BEGIN;

DROP POLICY IF EXISTS notifications_insert_any_authenticated ON public.notifications;
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY notifications_select_own
      ON public.notifications
      FOR SELECT TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND cmd = 'UPDATE'
  ) THEN
    CREATE POLICY notifications_update_own
      ON public.notifications
      FOR UPDATE TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY notifications_insert_own
      ON public.notifications
      FOR INSERT TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';;
