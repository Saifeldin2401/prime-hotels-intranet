
CREATE OR REPLACE FUNCTION public.handle_new_user_training()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Insert learning assignments for the new user based on their role
  INSERT INTO public.learning_assignments (
    target_type,
    target_id,
    content_type,
    content_id,
    due_date,
    assigned_by,
    created_at
  )
  SELECT
    'user'::learning_assignment_target_type, -- Cast to enum if needed, or string literal if text
    NEW.user_id::text,
    'training_module'::learning_assignment_content_type, -- Cast to enum
    tar.training_module_id,
    (NOW() + interval '30 days'),
    tar.created_by,
    NOW()
  FROM public.training_assignment_rules tar
  WHERE tar.target_role = NEW.role::text 
    AND tar.is_active = true
    AND tar.training_module_id IS NOT NULL;

  RETURN NEW;
END;
$function$;
