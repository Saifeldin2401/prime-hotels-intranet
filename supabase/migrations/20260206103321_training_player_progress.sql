-- Training Player Progress Enhancements
-- Date: 2026-02-06

BEGIN;

-- Extend learning_progress for richer player state
ALTER TABLE public.learning_progress
    ADD COLUMN IF NOT EXISTS last_block_index integer,
    ADD COLUMN IF NOT EXISTS last_block_id uuid REFERENCES public.training_content_blocks(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS time_spent_seconds integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS idx_learning_progress_last_block
    ON public.learning_progress(last_block_id);

CREATE INDEX IF NOT EXISTS idx_learning_progress_last_activity
    ON public.learning_progress(last_activity_at);

-- Per-block progress for training modules
CREATE TABLE IF NOT EXISTS public.training_block_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    training_module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
    block_id uuid NOT NULL REFERENCES public.training_content_blocks(id) ON DELETE CASCADE,
    completed_at timestamptz,
    last_viewed_at timestamptz DEFAULT now(),
    time_spent_seconds integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (user_id, block_id)
);

CREATE TRIGGER update_training_block_progress_updated_at
    BEFORE UPDATE ON public.training_block_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.training_block_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_block_progress_select" ON public.training_block_progress;
CREATE POLICY "training_block_progress_select" ON public.training_block_progress
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR public.has_any_role(auth.uid(), ARRAY['regional_admin','regional_hr','property_hr','property_manager','department_head']::app_role[])
    );

DROP POLICY IF EXISTS "training_block_progress_manage" ON public.training_block_progress;
CREATE POLICY "training_block_progress_manage" ON public.training_block_progress
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

COMMIT;
NOTIFY pgrst, 'reload schema';;
