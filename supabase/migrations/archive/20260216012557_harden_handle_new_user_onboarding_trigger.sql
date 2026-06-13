-- Harden onboarding trigger execution so user department assignment never fails
-- due to onboarding automation internals. Also avoid duplicate active processes.

CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  user_role text;
  matched_template_id uuid;
  v_training_id uuid;
  v_process_id uuid;
  v_task_id uuid;
BEGIN
  IF NEW.user_id IS NULL OR NEW.department_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Avoid creating duplicate active onboarding processes on profile updates.
  IF EXISTS (
    SELECT 1
    FROM public.onboarding_process op
    WHERE op.user_id = NEW.user_id
      AND op.status IN ('pending'::public.entity_status, 'in_progress'::public.entity_status)
  ) THEN
    RETURN NEW;
  END IF;

  SELECT ur.role::text
  INTO user_role
  FROM public.user_roles ur
  WHERE ur.user_id = NEW.user_id
  LIMIT 1;

  SELECT ot.id
  INTO matched_template_id
  FROM public.onboarding_templates ot
  WHERE ot.is_active = true
    AND (
      (ot.role::text = user_role)
      OR (ot.department_id = NEW.department_id)
      OR (ot.role IS NULL AND ot.department_id IS NULL)
    )
  ORDER BY
    CASE
      WHEN ot.role::text = user_role THEN 1
      WHEN ot.department_id = NEW.department_id THEN 2
      ELSE 3
    END
  LIMIT 1;

  IF matched_template_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.onboarding_process (user_id, template_id, status, start_date)
  VALUES (NEW.user_id, matched_template_id, 'in_progress'::public.entity_status, now())
  RETURNING id INTO v_process_id;

  INSERT INTO public.onboarding_tasks (
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
    t->>'title',
    t->>'description',
    CASE
      WHEN t->>'assignee_role' = 'self' THEN NEW.user_id
      WHEN t->>'assignee_role' = 'manager' THEN (
        SELECT p.reporting_to
        FROM public.profiles p
        WHERE p.id = NEW.user_id
      )
      ELSE NULL
    END,
    now() + ((t->>'due_day_offset')::int || ' days')::interval,
    t->>'link_type',
    CASE
      WHEN nullif(t->>'link_id', '') IS NOT NULL
        AND (t->>'link_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (t->>'link_id')::uuid
      ELSE NULL
    END
  FROM public.onboarding_templates ot,
       jsonb_array_elements(ot.tasks) AS t
  WHERE ot.id = matched_template_id;

  FOR v_training_id IN
    SELECT unnest(ot.required_training_ids)
    FROM public.onboarding_templates ot
    WHERE ot.id = matched_template_id
  LOOP
    INSERT INTO public.onboarding_tasks (
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
      'Complete Training: ' || tm.title,
      'Mandatory training module required for your role/department.',
      NEW.user_id,
      now() + interval '7 days',
      'training',
      v_training_id
    FROM public.training_modules tm
    WHERE tm.id = v_training_id
    RETURNING id INTO v_task_id;

    INSERT INTO public.learning_assignments (
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
      NEW.user_id::text,
      'user'::public.learning_target_type,
      v_training_id,
      'module'::public.learning_content_type,
      'assigned',
      now(),
      v_process_id,
      v_task_id
    )
    ON CONFLICT (target_id, content_type, content_id)
    DO UPDATE SET
      onboarding_process_id = EXCLUDED.onboarding_process_id,
      onboarding_task_id = EXCLUDED.onboarding_task_id;
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user_onboarding failed for user %, department %: %',
      NEW.user_id, NEW.department_id, SQLERRM;
    RETURN NEW;
END;
$function$;;
