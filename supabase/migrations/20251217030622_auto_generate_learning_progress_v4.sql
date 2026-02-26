-- Function to generate learning_progress records for assignments
CREATE OR REPLACE FUNCTION generate_assignment_progress()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create Trigger (drop first to be safe)
DROP TRIGGER IF EXISTS trigger_generate_assignment_progress ON learning_assignments;
CREATE TRIGGER trigger_generate_assignment_progress
  AFTER INSERT ON learning_assignments
  FOR EACH ROW
  EXECUTE FUNCTION generate_assignment_progress();

-- Backfill existing data
-- Everyone
INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
SELECT p.id, la.id, la.content_id, 'module', 'assigned'::learning_assignment_status
FROM profiles p
CROSS JOIN learning_assignments la
WHERE la.target_type = 'everyone'
AND la.content_type = 'module'
ON CONFLICT (user_id, content_type, content_id) DO NOTHING;

-- Department
INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
SELECT ud.user_id, la.id, la.content_id, 'module', 'assigned'::learning_assignment_status
FROM user_departments ud
JOIN learning_assignments la ON la.target_id::uuid = ud.department_id
WHERE la.target_type = 'department'
AND la.content_type = 'module'
ON CONFLICT (user_id, content_type, content_id) DO NOTHING;

-- Property
INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
SELECT up.user_id, la.id, la.content_id, 'module', 'assigned'::learning_assignment_status
FROM user_properties up
JOIN learning_assignments la ON la.target_id::uuid = up.property_id
WHERE la.target_type = 'property'
AND la.content_type = 'module'
ON CONFLICT (user_id, content_type, content_id) DO NOTHING;

-- User
INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
SELECT la.target_id::uuid, la.id, la.content_id, 'module', 'assigned'::learning_assignment_status
FROM learning_assignments la
WHERE la.target_type = 'user'
AND la.content_type = 'module'
ON CONFLICT (user_id, content_type, content_id) DO NOTHING;;
