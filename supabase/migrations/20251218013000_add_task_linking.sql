-- Add link_type and link_id to onboarding_tasks
ALTER TABLE onboarding_tasks 
ADD COLUMN IF NOT EXISTS link_type text CHECK (link_type IN ('training', 'document', 'url')),
ADD COLUMN IF NOT EXISTS link_id uuid;

-- Update the onboarding function to handle these new fields
CREATE OR REPLACE FUNCTION handle_new_user_onboarding()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  matched_template_id uuid;
  task_record jsonb;
BEGIN
  -- 1. Find a matching template (Role specific > Department specific > General fallback)
  SELECT id INTO matched_template_id
  FROM onboarding_templates
  WHERE is_active = true
    AND (
      (role = NEW.role::text) 
      OR (department_id = NEW.department_id)
      OR (role IS NULL AND department_id IS NULL)
    )
  ORDER BY 
    CASE 
      WHEN role = NEW.role::text THEN 1
      WHEN department_id = NEW.department_id THEN 2
      ELSE 3
    END
  LIMIT 1;

  -- 2. If template found, create process and tasks
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
        WHEN t->>'assignee_role' = 'manager' THEN (SELECT reporting_to FROM user_profiles WHERE id = NEW.user_id)
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
$$ LANGUAGE plpgsql;
