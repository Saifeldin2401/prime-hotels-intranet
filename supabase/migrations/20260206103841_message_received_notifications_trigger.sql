CREATE OR REPLACE FUNCTION public.notify_message_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.message_type = 'direct' AND NEW.recipient_id IS NOT NULL AND NEW.recipient_id <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata, created_at)
    VALUES (
      NEW.recipient_id,
      'message_received',
      'New message',
      COALESCE(NULLIF(NEW.subject, ''), 'You have a new message'),
      jsonb_build_object(
        'message_id', NEW.id,
        'sender_id', NEW.sender_id
      ),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_message_received ON public.messages;
CREATE TRIGGER trigger_notify_message_received
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_received();;
