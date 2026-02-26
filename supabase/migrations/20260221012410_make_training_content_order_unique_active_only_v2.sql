BEGIN;

ALTER TABLE public.training_content_blocks
DROP CONSTRAINT IF EXISTS training_content_blocks_training_module_id_order_key;

CREATE UNIQUE INDEX training_content_blocks_training_module_id_order_key
ON public.training_content_blocks (training_module_id, "order")
WHERE COALESCE(is_deleted, false) = false;

COMMIT;

NOTIFY pgrst, 'reload schema';;
