-- ============================================
-- FIXED ONBOARDING TRIGGER
-- Properly handles user_departments table (no role column)
-- ============================================

-- Drop the old broken function
DROP FUNCTION IF EXISTS handle_new_user_onboarding() CASCADE;

-- Create a fixed version that looks up role separately
CREATE OR REPLACE FUNCTION handle_new_user_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  matched_template_id uuid;
BEGIN
  -- 1. Look up the user's role from user_roles table
  SELECT role::text INTO user_role
  FROM user_roles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- 2. Find a matching template (Role specific > Department specific > General fallback)
  SELECT id INTO matched_template_id
  FROM onboarding_templates
  WHERE is_active = true
    AND (
      (role = user_role) 
      OR (department_id = NEW.department_id)
      OR (role IS NULL AND department_id IS NULL)
    )
  ORDER BY 
    CASE 
      WHEN role = user_role THEN 1
      WHEN department_id = NEW.department_id THEN 2
      ELSE 3
    END
  LIMIT 1;

  -- 3. If template found, create process and tasks
  IF matched_template_id IS NOT NULL THEN
    -- Create Process
    WITH new_process AS (
      INSERT INTO onboarding_process (user_id, template_id, status, assigned_at)
      VALUES (NEW.user_id, matched_template_id, 'active', NOW())
      RETURNING id
    )
    -- Create Tasks from Template
    INSERT INTO onboarding_tasks (process_id, title, description, assigned_to_id, due_date, link_type, link_id)
    SELECT 
      (SELECT id FROM new_process),
      t->>'title',
      t->>'description',
      CASE 
        WHEN t->>'assignee_role' = 'self' THEN NEW.user_id
        WHEN t->>'assignee_role' = 'manager' THEN (SELECT reporting_to FROM profiles WHERE id = NEW.user_id)
        ELSE NULL 
      END,
      NOW() + ((t->>'due_day_offset')::int || ' days')::interval,
      t->>'link_type',
      (t->>'link_id')::uuid
    FROM onboarding_templates, jsonb_array_elements(tasks) as t
    WHERE id = matched_template_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_department_assigned_start_onboarding
AFTER INSERT ON user_departments
FOR EACH ROW
EXECUTE FUNCTION handle_new_user_onboarding();;
