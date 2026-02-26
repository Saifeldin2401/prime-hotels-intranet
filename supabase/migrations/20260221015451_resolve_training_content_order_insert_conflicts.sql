-- Serialize and de-conflict training content block order writes per module.
-- This prevents 409 unique conflicts when multiple save requests race.

CREATE OR REPLACE FUNCTION public.training_content_blocks_resolve_duplicate_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.training_module_id IS NULL OR NEW."order" IS NULL THEN
    RETURN NEW;
  END IF;

  -- Lock per module for the duration of the transaction to avoid concurrent order-slot races.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.training_module_id::text, 0));

  -- Replace any existing active block occupying the same order slot.
  DELETE FROM public.training_content_blocks
  WHERE training_module_id = NEW.training_module_id
    AND "order" = NEW."order"
    AND coalesce(is_deleted, false) = false;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_content_blocks_resolve_duplicate_order ON public.training_content_blocks;

CREATE TRIGGER trg_training_content_blocks_resolve_duplicate_order
BEFORE INSERT ON public.training_content_blocks
FOR EACH ROW
EXECUTE FUNCTION public.training_content_blocks_resolve_duplicate_order();;
