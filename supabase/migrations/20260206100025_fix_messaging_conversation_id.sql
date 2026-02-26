DO $$
BEGIN
  IF to_regclass('public.messages') IS NULL THEN
    RAISE NOTICE 'messages table does not exist, skipping conversation_id fix';
    RETURN;
  END IF;

  IF to_regclass('public.conversations') IS NULL THEN
    RAISE NOTICE 'conversations table does not exist, skipping conversation_id fix';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE public.messages
      ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
      ON public.messages(conversation_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.conversation_id IS NOT NULL)
  EXECUTE FUNCTION public.update_conversation_last_message();;
