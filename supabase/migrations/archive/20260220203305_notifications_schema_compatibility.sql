-- Notifications schema compatibility and hardening
-- Ensures legacy + new notification writers work against one stable contract.

BEGIN;

-- Core compatibility columns used across app, SQL functions, and edge functions
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Keep read flag available for UI compatibility
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN GENERATED ALWAYS AS (read_at IS NOT NULL) STORED;

-- Normalize type to TEXT (works for both enum-based and text-based schemas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'type'
      AND udt_name = 'notification_type'
  ) THEN
    ALTER TABLE public.notifications
      ALTER COLUMN type TYPE TEXT USING type::text;
  END IF;
END $$;

-- Remove restrictive type check constraints so dynamic notification types cannot fail inserts
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

-- Keep metadata/data mutually populated for old and new writers
UPDATE public.notifications
SET
  metadata = COALESCE(metadata, data, '{}'::jsonb),
  data = COALESCE(data, metadata, '{}'::jsonb);

ALTER TABLE public.notifications
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN data SET DEFAULT '{}'::jsonb,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Ensure modtime trigger exists and is consistent
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: self-read/self-update + authenticated insert
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'notifications_select_own'
  ) THEN
    CREATE POLICY notifications_select_own
      ON public.notifications
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'notifications_update_own'
  ) THEN
    CREATE POLICY notifications_update_own
      ON public.notifications
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'notifications_insert_any_authenticated'
  ) THEN
    CREATE POLICY notifications_insert_any_authenticated
      ON public.notifications
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Performance indexes used by dashboard + bell queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id)
  WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_entity
  ON public.notifications(user_id, entity_type, entity_id);

COMMIT;

NOTIFY pgrst, 'reload schema';;
