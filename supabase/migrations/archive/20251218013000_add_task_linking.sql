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
  process_id uuid;
  task_record jsonb;
  user_role public.app_role;
  assignee_id uuid;
BEGIN
  -- 1. Determine the user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- 2. Find a matching template (Department specific > Role specific > General fallback)
  SELECT id INTO matched_template_id
  FROM public.onboarding_templates
  WHERE is_active = true
    AND (
      (department_id = NEW.department_id)
      OR (department_id IS NULL AND role = user_role)
      OR (role IS NULL AND department_id IS NULL)
    )
  ORDER BY
    CASE
      WHEN department_id = NEW.department_id THEN 1
      WHEN department_id IS NULL AND role = user_role THEN 2
      ELSE 3
    END,
    created_at DESC
  LIMIT 1;

  -- 3. If template found, create process and tasks
  IF matched_template_id IS NOT NULL THEN
    INSERT INTO public.onboarding_process (user_id, template_id, status, start_date)
    VALUES (NEW.user_id, matched_template_id, 'pending', NOW())
    RETURNING id INTO process_id;

    FOR task_record IN
      SELECT * FROM jsonb_array_elements((SELECT tasks FROM public.onboarding_templates WHERE id = matched_template_id))
    LOOP
      IF (task_record->>'assignee_role') = 'self' THEN
        assignee_id := NEW.user_id;
      ELSIF (task_record->>'assignee_role') = 'manager' THEN
        SELECT reporting_to INTO assignee_id FROM public.profiles WHERE id = NEW.user_id;
      ELSE
        assignee_id := NULL;
      END IF;

      INSERT INTO public.onboarding_tasks (
        process_id,
        title,
        description,
        assigned_to_id,
        due_date,
        status,
        link_type,
        link_id
      ) VALUES (
        process_id,
        task_record->>'title',
        task_record->>'description',
        assignee_id,
        NOW() + ((task_record->>'due_day_offset')::int || ' days')::interval,
        'pending',
        task_record->>'link_type',
        NULLIF(task_record->>'link_id', '')::uuid
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
