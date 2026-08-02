-- training_block_progress: ALL qual (user_id = auth.uid()) is literally the
-- first OR-branch of the SELECT policy's qual (own OR admin roles) -- same
-- verified-subset pattern as batch2. Missed in that batch; fixing here.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-01.
DROP POLICY training_block_progress_manage ON public.training_block_progress;
CREATE POLICY training_block_progress_manage_insert ON public.training_block_progress FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY training_block_progress_manage_update ON public.training_block_progress FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY training_block_progress_manage_delete ON public.training_block_progress FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
