-- Correction to the previous migration: WITH CHECK is evaluated against the NEW row, so
-- requiring status <> 'archived' there blocked the archive transition itself (useArchiveMessage
-- sets status='archived', which the check clause then immediately rejected). USING (evaluated
-- against the OLD row) is the right place to gate "can't touch an already-archived message";
-- WITH CHECK should only re-verify the party relationship on the resulting row, not forbid the
-- specific status value being set.
DROP POLICY IF EXISTS consolidated_messages_update ON public.messages;

CREATE POLICY consolidated_messages_update ON public.messages
  FOR UPDATE TO authenticated
  USING (
    ((select auth.uid()) = sender_id OR (select auth.uid()) = recipient_id)
    AND status <> 'archived'
  )
  WITH CHECK (
    (select auth.uid()) = sender_id OR (select auth.uid()) = recipient_id
  );
