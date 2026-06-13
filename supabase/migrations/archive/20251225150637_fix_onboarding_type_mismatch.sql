-- Fix type mismatch in existing onboarding function
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS trigger AS $$
DECLARE
  user_role text;
  matched_template_id uuid;
BEGIN
  -- 1. Look up the user's role from user_roles table
  SELECT role::text INTO user_role
  FROM user_roles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- 2. Find a matching template
  SELECT id INTO matched_template_id
  FROM onboarding_templates
  WHERE is_active = true
    AND (
      (role::text = user_role)  -- Added explicit cast here
      OR (department_id = NEW.department_id)
      OR (role IS NULL AND department_id IS NULL)
    )
  ORDER BY 
    CASE 
      WHEN role::text = user_role THEN 1 -- Added explicit cast here
      WHEN department_id = NEW.department_id THEN 2
      ELSE 3
    END
  LIMIT 1;

  -- 3. If template found, create process and tasks
  IF matched_template_id IS NOT NULL THEN
    -- Create Process with Valid Status 'in_progress'
    WITH new_process AS (
      INSERT INTO onboarding_process (user_id, template_id, status, assigned_at, start_date)
      VALUES (NEW.user_id, matched_template_id, 'in_progress', NOW(), NOW())
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
;
