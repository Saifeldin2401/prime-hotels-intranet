-- 1. Update onboarding_templates schema
ALTER TABLE public.onboarding_templates 
ADD COLUMN IF NOT EXISTS required_training_ids UUID[] DEFAULT '{}'::uuid[];

-- 2. Update the onboarding trigger function to handle training assignment
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS trigger AS $$
DECLARE
  user_role text;
  matched_template_id uuid;
  v_training_id uuid;
  v_process_id uuid;
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
      (role::text = user_role) 
      OR (department_id = NEW.department_id)
      OR (role IS NULL AND department_id IS NULL)
    )
  ORDER BY 
    CASE 
      WHEN role::text = user_role THEN 1
      WHEN department_id = NEW.department_id THEN 2
      ELSE 3
    END
  LIMIT 1;

  -- 3. If template found, create process and tasks
  IF matched_template_id IS NOT NULL THEN
    -- Create Process
    INSERT INTO onboarding_process (user_id, template_id, status, start_date)
    VALUES (NEW.user_id, matched_template_id, 'in_progress', NOW())
    RETURNING id INTO v_process_id;

    -- A. Create STANDARD Tasks from Template JSON
    INSERT INTO onboarding_tasks (process_id, title, description, assigned_to_id, due_date, link_type, link_id)
    SELECT 
      v_process_id,
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

    -- B. Create TRAINING Tasks and Assignments from required_training_ids
    FOR v_training_id IN 
      SELECT unnest(required_training_ids) 
      FROM onboarding_templates 
      WHERE id = matched_template_id 
    LOOP
      -- I. Create the Learning Assignment
      INSERT INTO learning_assignments (target_id, content_id, status, created_at)
      VALUES (NEW.user_id, v_training_id, 'assigned', NOW())
      ON CONFLICT DO NOTHING;

      -- II. Create the Onboarding Task linked to this training
      INSERT INTO onboarding_tasks (
        process_id, 
        title, 
        description, 
        assigned_to_id, 
        due_date, 
        link_type, 
        link_id
      )
      SELECT 
        v_process_id,
        'Complete Training: ' || title,
        'Mandatory training module required for your role/department.',
        NEW.user_id,
        NOW() + INTERVAL '7 days',
        'training',
        v_training_id
      FROM training_modules
      WHERE id = v_training_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a sync trigger to auto-complete onboarding tasks when training is done
CREATE OR REPLACE FUNCTION public.sync_training_completion_to_onboarding()
RETURNS trigger AS $$
BEGIN
  -- If training is completed, find matching onboarding task and mark it done
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.onboarding_tasks
    SET is_completed = true, 
        status = 'completed',
        completed_at = NOW()
    WHERE assigned_to_id = NEW.target_id
      AND link_type = 'training'
      AND link_id = NEW.content_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_training_to_onboarding ON public.learning_assignments;
CREATE TRIGGER trg_sync_training_to_onboarding
AFTER UPDATE OF status ON public.learning_assignments
FOR EACH ROW EXECUTE FUNCTION sync_training_completion_to_onboarding();
;
