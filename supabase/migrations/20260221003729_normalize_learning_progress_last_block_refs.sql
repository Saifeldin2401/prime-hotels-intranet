-- Prevent stale/deleted block references from breaking learning progress updates.
BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_learning_progress_last_block_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  block_module_id uuid;
BEGIN
  IF NEW.last_block_id IS NULL THEN
    IF COALESCE(NEW.metadata, '{}'::jsonb) ? 'active_block_id' THEN
      NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{active_block_id}', 'null'::jsonb, true);
    END IF;
    RETURN NEW;
  END IF;

  SELECT tcb.training_module_id
  INTO block_module_id
  FROM public.training_content_blocks tcb
  WHERE tcb.id = NEW.last_block_id
  LIMIT 1;

  IF block_module_id IS NULL THEN
    NEW.last_block_id := NULL;
    IF COALESCE(NEW.metadata, '{}'::jsonb) ? 'active_block_id' THEN
      NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{active_block_id}', 'null'::jsonb, true);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.content_type = 'module'::public.learning_content_type
     AND NEW.content_id IS DISTINCT FROM block_module_id THEN
    NEW.last_block_id := NULL;
    IF COALESCE(NEW.metadata, '{}'::jsonb) ? 'active_block_id' THEN
      NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{active_block_id}', 'null'::jsonb, true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_learning_progress_last_block_id ON public.learning_progress;
CREATE TRIGGER trg_normalize_learning_progress_last_block_id
BEFORE INSERT OR UPDATE OF last_block_id, content_type, content_id, metadata
ON public.learning_progress
FOR EACH ROW
EXECUTE FUNCTION public.normalize_learning_progress_last_block_id();

UPDATE public.learning_progress lp
SET
  last_block_id = NULL,
  metadata = CASE
    WHEN COALESCE(lp.metadata, '{}'::jsonb) ? 'active_block_id'
      THEN jsonb_set(COALESCE(lp.metadata, '{}'::jsonb), '{active_block_id}', 'null'::jsonb, true)
    ELSE COALESCE(lp.metadata, '{}'::jsonb)
  END
WHERE lp.last_block_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.training_content_blocks tcb
    WHERE tcb.id = lp.last_block_id
      AND (
        lp.content_type <> 'module'::public.learning_content_type
        OR tcb.training_module_id = lp.content_id
      )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';;
