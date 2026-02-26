-- ============================================
-- FIX LEARNING SYSTEM TRIGGERS
-- Make automatic progress generation bypass RLS
-- ============================================

-- 1. Make generate_assignment_progress SECURITY DEFINER
CREATE OR REPLACE FUNCTION generate_assignment_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner privileges
SET search_path = public
AS $$
BEGIN
  -- Handle 'everyone' assignments
  IF NEW.target_type = 'everyone' AND NEW.content_type = 'module' THEN
    INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
    SELECT id, NEW.id, NEW.content_id, 'module', 'assigned'::learning_assignment_status
    FROM profiles
    ON CONFLICT (user_id, content_type, content_id) DO NOTHING;
  END IF;

  -- Handle 'department' assignments
  IF NEW.target_type = 'department' AND NEW.content_type = 'module' THEN
    INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
    SELECT user_id, NEW.id, NEW.content_id, 'module', 'assigned'::learning_assignment_status
    FROM user_departments
    WHERE department_id = NEW.target_id::uuid
    ON CONFLICT (user_id, content_type, content_id) DO NOTHING;
  END IF;

  -- Handle 'property' assignments
  IF NEW.target_type = 'property' AND NEW.content_type = 'module' THEN
    INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
    SELECT user_id, NEW.id, NEW.content_id, 'module', 'assigned'::learning_assignment_status
    FROM user_properties
    WHERE property_id = NEW.target_id::uuid
    ON CONFLICT (user_id, content_type, content_id) DO NOTHING;
  END IF;

  -- Handle 'user' assignments
  IF NEW.target_type = 'user' AND NEW.content_type = 'module' THEN
    INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
    VALUES (NEW.target_id::uuid, NEW.id, NEW.content_id, 'module', 'assigned'::learning_assignment_status)
    ON CONFLICT (user_id, content_type, content_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;;
