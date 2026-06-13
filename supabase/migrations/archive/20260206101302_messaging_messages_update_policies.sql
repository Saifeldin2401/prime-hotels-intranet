ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_update_own_draft_messages" ON public.messages;
DROP POLICY IF EXISTS "users_mark_messages_read" ON public.messages;
DROP POLICY IF EXISTS "users_archive_own_messages" ON public.messages;

CREATE POLICY "users_update_own_draft_messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id AND status = 'draft')
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "users_mark_messages_read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id AND status IN ('sent', 'delivered'))
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "users_archive_own_messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = recipient_id);
;
