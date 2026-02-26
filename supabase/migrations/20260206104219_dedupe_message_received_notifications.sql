ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS link text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_message_received
  ON public.notifications(user_id, type, entity_type, entity_id)
  WHERE type = 'message_received' AND entity_type = 'message' AND entity_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.notify_message_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.message_type = 'direct' AND NEW.recipient_id IS NOT NULL AND NEW.recipient_id <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata, entity_type, entity_id, link, created_at)
    VALUES (
      NEW.recipient_id,
      'message_received',
      'New message',
      COALESCE(NULLIF(NEW.subject, ''), 'You have a new message'),
      jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.sender_id),
      'message',
      NEW.id,
      '/messaging/' || NEW.id::text,
      now()
    )
    ON CONFLICT (user_id, type, entity_type, entity_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_message_received ON public.messages;
CREATE TRIGGER trigger_notify_message_received
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_received();;
