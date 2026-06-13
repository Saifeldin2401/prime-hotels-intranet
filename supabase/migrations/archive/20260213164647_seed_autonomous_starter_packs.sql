DO $$
DECLARE
  v_workflow_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workflow_definitions
    WHERE name = 'New Hire Welcome Pack' AND COALESCE(is_deleted, false) = false
  ) THEN
    INSERT INTO public.workflow_definitions (
      name,
      description,
      type,
      trigger_config,
      action_config,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      'New Hire Welcome Pack',
      'Welcome workflow for new staff: notify, assign training, create onboarding task.',
      'event-based',
      jsonb_build_object('event', 'NEW_HIRE'),
      '{}'::jsonb,
      true,
      now(),
      now()
    ) RETURNING id INTO v_workflow_id;

    INSERT INTO public.workflow_steps (workflow_id, step_order, name, action, config)
    VALUES
      (v_workflow_id, 1, 'Send Welcome Notification', 'send_notification',
        jsonb_build_object(
          'title', 'Welcome to Prime Hotels',
          'message', 'Welcome aboard! Please review your onboarding checklist and assigned training.'
        )
      ),
      (v_workflow_id, 2, 'Assign Guest Check-In Training', 'assign_training',
        jsonb_build_object('module_id', 'f3f340d8-2fe0-4662-9736-3040c68598c4')
      ),
      (v_workflow_id, 3, 'Create Profile Setup Task', 'create_task',
        jsonb_build_object(
          'title', 'Complete Your Profile Setup',
          'description', 'Add emergency contact, verify personal details, and review policies.',
          'priority', 'medium'
        )
      );
  ELSE
    SELECT id INTO v_workflow_id
    FROM public.workflow_definitions
    WHERE name = 'New Hire Welcome Pack' AND COALESCE(is_deleted, false) = false
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_workflow_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.trigger_rules
    WHERE name = 'Auto Onboarding: Welcome Pack'
  ) THEN
    INSERT INTO public.trigger_rules (
      event_type,
      name,
      description,
      conditions,
      action_type,
      action_config,
      is_active,
      created_at
    ) VALUES (
      'NEW_HIRE',
      'Auto Onboarding: Welcome Pack',
      'Start the welcome workflow for new hires.',
      '[]'::jsonb,
      'start_workflow',
      jsonb_build_object('workflow_id', v_workflow_id),
      true,
      now()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.trigger_rules
    WHERE name = 'Role Change: Assign Guest Check-In Training'
  ) THEN
    INSERT INTO public.trigger_rules (
      event_type,
      name,
      description,
      conditions,
      action_type,
      action_config,
      is_active,
      created_at
    ) VALUES (
      'ROLE_CHANGE',
      'Role Change: Assign Guest Check-In Training',
      'Assign guest check-in training when a user becomes staff.',
      '[{"field":"new_role","operator":"equals","value":"staff"}]'::jsonb,
      'assign_training',
      jsonb_build_object('target_id', 'f3f340d8-2fe0-4662-9736-3040c68598c4', 'due_days', 14),
      true,
      now()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.trigger_rules
    WHERE name = 'Document Expiring: Notify User'
  ) THEN
    INSERT INTO public.trigger_rules (
      event_type,
      name,
      description,
      conditions,
      action_type,
      action_config,
      is_active,
      created_at
    ) VALUES (
      'DOCUMENT_EXPIRING',
      'Document Expiring: Notify User',
      'Notify staff when compliance documents are nearing expiry.',
      '[]'::jsonb,
      'send_notification',
      jsonb_build_object(
        'title', 'Document Expiring Soon',
        'message', 'A required document is nearing expiry. Please review and update it.'
      ),
      true,
      now()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.training_assignment_rules
    WHERE target_role = 'department_head'
      AND training_module_id = 'e0000000-0000-0000-0007-000000000004'
  ) THEN
    INSERT INTO public.training_assignment_rules (
      training_module_id,
      target_role,
      target_department_id,
      job_title_id,
      is_active,
      created_at
    ) VALUES (
      'e0000000-0000-0000-0007-000000000004',
      'department_head',
      NULL,
      NULL,
      true,
      now()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.training_assignment_rules
    WHERE target_role = 'staff'
      AND training_module_id = 'f3f340d8-2fe0-4662-9736-3040c68598c4'
  ) THEN
    INSERT INTO public.training_assignment_rules (
      training_module_id,
      target_role,
      target_department_id,
      job_title_id,
      is_active,
      created_at
    ) VALUES (
      'f3f340d8-2fe0-4662-9736-3040c68598c4',
      'staff',
      NULL,
      NULL,
      true,
      now()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.training_assignment_rules
    WHERE job_title_id = '52e4a29a-9af3-4f79-be1a-aca5f18ab3af'
      AND training_module_id = 'e0000000-0000-0000-0007-000000000003'
  ) THEN
    INSERT INTO public.training_assignment_rules (
      training_module_id,
      target_role,
      target_department_id,
      job_title_id,
      is_active,
      created_at
    ) VALUES (
      'e0000000-0000-0000-0007-000000000003',
      NULL,
      NULL,
      '52e4a29a-9af3-4f79-be1a-aca5f18ab3af',
      true,
      now()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.training_assignment_rules
    WHERE target_department_id = '4b5418e9-4e58-4738-b9a1-9b2d627cdb77'
      AND training_module_id = 'e0000000-0000-0000-0007-000000000004'
  ) THEN
    INSERT INTO public.training_assignment_rules (
      training_module_id,
      target_role,
      target_department_id,
      job_title_id,
      is_active,
      created_at
    ) VALUES (
      'e0000000-0000-0000-0007-000000000004',
      NULL,
      '4b5418e9-4e58-4738-b9a1-9b2d627cdb77',
      NULL,
      true,
      now()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.task_templates
    WHERE title = 'Weekly Fire Safety Inspection'
  ) THEN
    INSERT INTO public.task_templates (
      title,
      description,
      priority,
      recurrence_type,
      recurrence_config,
      assigned_to_id,
      property_id,
      department_id,
      is_active,
      last_run_at,
      next_run_at,
      created_at,
      updated_at
    ) VALUES (
      'Weekly Fire Safety Inspection',
      'Inspect fire extinguishers, exits, and safety signage.',
      'high',
      'weekly',
      '{}'::jsonb,
      NULL,
      '739771e0-08ff-4e07-992f-d2be1770aa59',
      '4b5418e9-4e58-4738-b9a1-9b2d627cdb77',
      true,
      NULL,
      public.calculate_next_task_run('weekly', now()),
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.task_templates
    WHERE title = 'Monthly Emergency Response Inventory'
  ) THEN
    INSERT INTO public.task_templates (
      title,
      description,
      priority,
      recurrence_type,
      recurrence_config,
      assigned_to_id,
      property_id,
      department_id,
      is_active,
      last_run_at,
      next_run_at,
      created_at,
      updated_at
    ) VALUES (
      'Monthly Emergency Response Inventory',
      'Verify emergency kits, radios, and incident logs are complete.',
      'medium',
      'monthly',
      '{}'::jsonb,
      NULL,
      'e1514198-354f-45a4-845f-e568095110af',
      'c00f14b7-025c-4e6f-9404-336a1a52c0a9',
      true,
      NULL,
      public.calculate_next_task_run('monthly', now()),
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.task_templates
    WHERE title = 'Daily Front Desk Readiness Checklist'
  ) THEN
    INSERT INTO public.task_templates (
      title,
      description,
      priority,
      recurrence_type,
      recurrence_config,
      assigned_to_id,
      property_id,
      department_id,
      is_active,
      last_run_at,
      next_run_at,
      created_at,
      updated_at
    ) VALUES (
      'Daily Front Desk Readiness Checklist',
      'Confirm lobby readiness, VIP arrivals, and shift handover logs.',
      'medium',
      'daily',
      '{}'::jsonb,
      NULL,
      '990b0b9e-faeb-49fd-9c90-5308d7515c18',
      '125ccbe0-a609-4013-b809-fec7d225eaf8',
      true,
      NULL,
      public.calculate_next_task_run('daily', now()),
      now(),
      now()
    );
  END IF;
END $$;

UPDATE public.system_automations_config
SET is_enabled = true,
    config = jsonb_build_object('max_days', 2, 'allowed_types', jsonb_build_array('sick','annual','emergency')),
    updated_at = now()
WHERE id = 'smart_leave';

UPDATE public.system_automations_config
SET is_enabled = true,
    config = jsonb_build_object('default_due_days', 21),
    updated_at = now()
WHERE id = 'auto_training';

UPDATE public.system_automations_config
SET is_enabled = true,
    config = jsonb_build_object('run_time', '00:30', 'timezone', 'UTC'),
    updated_at = now()
WHERE id = 'recurring_tasks';;
