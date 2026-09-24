-- SEC-10: consolidated_messages_update ended with a trailing
-- `OR ((sender_id = auth.uid()) OR (recipient_id = auth.uid()))` clause that subsumed every
-- preceding status-specific guard, making them dead - any party to a message could UPDATE any
-- column of it regardless of status. Combined with table-level UPDATE being granted on every
-- column (the Postgres default), a recipient could rewrite a message's content or forge its
-- sender_id. The only real frontend usage (useMessaging.ts: useUpdateMessage/
-- useMarkMessageAsRead/useArchiveMessage, called from MessageDetail.tsx) only ever touches
-- status/read_at/updated_at - never content, subject, or sender_id.
--
-- Fix in two layers: (1) drop the row-level catch-all so the three status-scoped branches
-- actually apply, and (2) restrict the *columns* authenticated can UPDATE via column-level GRANT
-- - row-level policies alone cannot stop a column rewrite once a row is targetable, only a
-- column grant can. This is defense in depth: even if a future row-level branch is written too
-- loosely again, content/subject/sender_id stay immutable to ordinary users at the grant layer.
DROP POLICY IF EXISTS consolidated_messages_update ON public.messages;

CREATE POLICY consolidated_messages_update ON public.messages
  FOR UPDATE TO authenticated
  USING (
    ((select auth.uid()) = sender_id OR (select auth.uid()) = recipient_id)
    AND status <> 'archived'
  )
  WITH CHECK (
    ((select auth.uid()) = sender_id OR (select auth.uid()) = recipient_id)
    AND status <> 'archived'
  );

REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (status, read_at, updated_at) ON public.messages TO authenticated;
