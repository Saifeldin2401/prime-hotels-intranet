-- Fix onboarding task creation to store training link_id as uuid (not text)
create or replace function public.handle_new_user_onboarding()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  user_role text;
  matched_template_id uuid;
  v_training_id uuid;
  v_process_id uuid;
  v_task_id uuid;
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
      -- I. Create the Onboarding Task FIRST to get its ID
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
      WHERE id = v_training_id
      RETURNING id INTO v_task_id;

      -- II. Create the Learning Assignment linked to this task
      INSERT INTO learning_assignments (
        target_id, 
        target_type,
        content_id, 
        content_type,
        status, 
        created_at,
        onboarding_process_id,
        onboarding_task_id
      )
      VALUES (
        NEW.user_id, 
        'user'::learning_target_type,
        v_training_id, 
        'module'::learning_content_type,
        'assigned', 
        NOW(),
        v_process_id,
        v_task_id
      )
      ON CONFLICT (target_id, content_type, content_id) 
      DO UPDATE SET 
        onboarding_process_id = EXCLUDED.onboarding_process_id,
        onboarding_task_id = EXCLUDED.onboarding_task_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;
