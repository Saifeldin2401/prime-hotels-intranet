CREATE OR REPLACE FUNCTION handle_new_learning_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  module_title text;
BEGIN
  -- Only notify for 'assigned' status
  IF NEW.status = 'assigned' THEN
    -- Get module title
    IF NEW.content_type = 'module' THEN
      SELECT title INTO module_title FROM training_modules WHERE id = NEW.content_id;
    END IF;

    -- Fallback title if not found or different content type
    IF module_title IS NULL THEN
      module_title := 'New Training Module';
    END IF;

    -- Insert notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      NEW.user_id,
      'training_assigned',
      'New Training Assigned',
      'You have been assigned: ' || module_title,
      '/learning/my-learning',
      'learning_progress',
      NEW.id,
      jsonb_build_object('content_id', NEW.content_id, 'content_type', NEW.content_type)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_learning_assign ON learning_progress;

CREATE TRIGGER trg_notify_new_learning_assign
AFTER INSERT ON learning_progress
FOR EACH ROW
EXECUTE FUNCTION handle_new_learning_assignment_notification();;
