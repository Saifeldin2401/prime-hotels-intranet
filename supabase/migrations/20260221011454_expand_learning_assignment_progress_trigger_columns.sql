BEGIN;

DROP TRIGGER IF EXISTS trg_generate_assignment_progress ON public.learning_assignments;

CREATE TRIGGER trg_generate_assignment_progress
AFTER INSERT OR UPDATE OF
  target_type,
  target_id,
  content_type,
  content_id,
  is_deleted,
  status,
  due_date,
  valid_from,
  expires_at,
  priority,
  instructions,
  requires_acknowledgement,
  notify_on_due,
  reminder_days_before
ON public.learning_assignments
FOR EACH ROW
WHEN (COALESCE(NEW.is_deleted, false) = false)
EXECUTE FUNCTION public.generate_assignment_progress();

COMMIT;

NOTIFY pgrst, 'reload schema';;
