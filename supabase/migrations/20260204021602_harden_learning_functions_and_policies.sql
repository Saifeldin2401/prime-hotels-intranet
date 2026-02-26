-- 1. Harden generate_assignment_progress with search_path
CREATE OR REPLACE FUNCTION generate_assignment_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle 'everyone' assignments
  IF NEW.target_type = 'everyone' AND NEW.content_type = 'module' THEN
    INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
    SELECT id, NEW.id, NEW.content_id, 'module', 'assigned'::learning_assignment_status
    FROM profiles
    ON CONFLICT (user_id, content_type, content_id) 
    DO UPDATE SET 
        assignment_id = EXCLUDED.assignment_id,
        status = 'assigned',
        updated_at = NOW();
  END IF;

  -- Handle 'department' assignments
  IF NEW.target_type = 'department' AND NEW.content_type = 'module' THEN
    INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
    SELECT user_id, NEW.id, NEW.content_id, 'module', 'assigned'::learning_assignment_status
    FROM user_departments
    WHERE department_id = NEW.target_id::uuid
    ON CONFLICT (user_id, content_type, content_id) 
    DO UPDATE SET 
        assignment_id = EXCLUDED.assignment_id,
        status = 'assigned',
        updated_at = NOW();
  END IF;

  -- Handle 'property' assignments
  IF NEW.target_type = 'property' AND NEW.content_type = 'module' THEN
    INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
    SELECT user_id, NEW.id, NEW.content_id, 'module', 'assigned'::learning_assignment_status
    FROM user_properties
    WHERE property_id = NEW.target_id::uuid
    ON CONFLICT (user_id, content_type, content_id) 
    DO UPDATE SET 
        assignment_id = EXCLUDED.assignment_id,
        status = 'assigned',
        updated_at = NOW();
  END IF;

  -- Handle 'user' assignments
  IF NEW.target_type = 'user' AND NEW.content_type = 'module' THEN
    INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
    VALUES (NEW.target_id::uuid, NEW.id, NEW.content_id, 'module', 'assigned'::learning_assignment_status)
    ON CONFLICT (user_id, content_type, content_id) 
    DO UPDATE SET 
        assignment_id = EXCLUDED.assignment_id,
        status = 'assigned',
        updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Harden handle_new_learning_assignment_notification with search_path
CREATE OR REPLACE FUNCTION handle_new_learning_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  module_title text;
  should_notify boolean := false;
BEGIN
  -- Determine logical condition for notification
  IF TG_OP = 'INSERT' AND NEW.status = 'assigned' THEN
    should_notify := true;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'assigned' AND (NEW.assignment_id IS DISTINCT FROM OLD.assignment_id) THEN
    should_notify := true;
  END IF;

  IF should_notify THEN
    -- Get module title
    IF NEW.content_type = 'module' THEN
      SELECT title INTO module_title FROM training_modules WHERE id = NEW.content_id;
    END IF;

    -- Fallback title
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Add explicit policy for Admins/Managers to manage progress (Fallback)
DROP POLICY IF EXISTS "Admins can manage all progress" ON "public"."learning_progress";

CREATE POLICY "Admins can manage all progress"
ON "public"."learning_progress"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'regional_admin'::text) OR 
  has_role(auth.uid(), 'regional_hr'::text) OR 
  has_role(auth.uid(), 'property_manager'::text) OR
  has_role(auth.uid(), 'property_hr'::text)
);;
