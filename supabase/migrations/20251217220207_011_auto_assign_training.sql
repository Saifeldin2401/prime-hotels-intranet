CREATE OR REPLACE FUNCTION public.handle_new_user_training()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert training assignments for the new user based on their role
  INSERT INTO public.training_assignments (
    training_module_id,
    assigned_to_user_id,
    assigned_by,
    deadline,
    recurring_type,
    created_at
  )
  SELECT
    tar.training_module_id,
    NEW.user_id, -- The user_id from user_roles table
    tar.created_by, -- The creator of the rule acts as the assigner
    (NOW() + interval '30 days'), -- Default deadline
    'none',
    NOW()
  FROM public.training_assignment_rules tar
  WHERE tar.target_role = NEW.role::text 
    AND tar.is_active = true
    AND tar.training_module_id IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid error on re-run
DROP TRIGGER IF EXISTS on_user_role_assigned ON public.user_roles;

CREATE TRIGGER on_user_role_assigned
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_training();;
